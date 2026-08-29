<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Member;
use App\Models\QrToken;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly VerificationService $verification,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request, Activity $activity): AnonymousResourceCollection
    {
        $this->authorize('viewAttendance', $activity);

        $attendances = $activity->attendances()
            ->with(['member:id,member_code,last_name,middle_name,first_name,photo_path', 'recorder:id,name'])
            ->orderByDesc('recorded_at')
            ->paginate(min($request->integer('per_page', 50), 200));

        return AttendanceResource::collection($attendances);
    }

    /**
     * Pointage d'un membre. Le scan QR passe par le service de vérification :
     * une carte révoquée ne permet donc jamais d'enregistrer une présence.
     */
    public function store(RecordAttendanceRequest $request, Activity $activity): JsonResponse
    {
        $validated = $request->validated();

        $member = $this->resolveMember($validated, $request, $activity);

        if ($member instanceof JsonResponse) {
            return $member;
        }

        if (! $member->isVisibleTo($request->user())) {
            return response()->json([
                'message' => 'Ce membre est en dehors de votre zone de responsabilité.',
            ], 403);
        }

        $status = AttendanceStatus::from($validated['status'] ?? AttendanceStatus::Present->value);
        $method = ! empty($validated['qr_token']) ? 'qr' : 'manual';

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => $status,
                'method' => $method,
                'recorded_at' => now(),
                'recorded_by' => $request->user()->id,
                'note' => $validated['note'] ?? null,
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => ['status' => 'confirmed', 'confirmed_at' => now()],
        ]);

        $this->audit->log(
            'attendance.recorded',
            $attendance,
            "{$member->member_code} — {$status->label()} ({$method}) sur {$activity->code}",
        );

        $this->notifications->attendanceRecorded($member, $activity, $status->label());

        return response()->json([
            'message' => "Présence enregistrée : {$member->full_name} — {$status->label()}.",
            'data' => new AttendanceResource($attendance->load(['member', 'recorder'])),
        ], 201);
    }

    /** Correction manuelle d'un pointage déjà saisi. */
    public function update(Request $request, Activity $activity, Attendance $attendance): JsonResponse
    {
        $this->authorize('recordAttendance', $activity);

        abort_unless($attendance->activity_id === $activity->id, 404, 'Ressource introuvable.');

        $validated = $request->validate([
            'status' => ['required', \Illuminate\Validation\Rule::in(AttendanceStatus::values())],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $before = $attendance->getAttributes();

        $attendance->update([
            'status' => $validated['status'],
            'note' => $validated['note'] ?? $attendance->note,
            'method' => 'manual',
            'recorded_by' => $request->user()->id,
        ]);

        $this->audit->logChanges('attendance.corrected', $attendance, $before, 'Correction manuelle de présence');

        return response()->json([
            'message' => 'Présence corrigée.',
            'data' => new AttendanceResource($attendance->load(['member', 'recorder'])),
        ]);
    }

    /** Feuille de présence : participants attendus et statut de pointage. */
    public function sheet(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('viewAttendance', $activity);

        $attendances = $activity->attendances()->get()->keyBy('member_id');

        $rows = $activity->members()
            ->with(['structure:id,name'])
            ->orderBy('last_name')
            ->get()
            ->map(function (Member $member) use ($attendances) {
                $attendance = $attendances->get($member->id);

                return [
                    'member_id' => $member->id,
                    'member_code' => $member->member_code,
                    'full_name' => $member->full_name,
                    'structure' => $member->structure?->name,
                    'photo_url' => $member->photo_path ? route('media.member-photo', ['member' => $member->member_code]) : null,
                    'status' => $attendance?->status->value,
                    'status_label' => $attendance?->status->label(),
                    'method' => $attendance?->method,
                    'recorded_at' => $attendance?->recorded_at?->toIso8601String(),
                ];
            });

        return response()->json([
            'activity' => [
                'id' => $activity->id,
                'code' => $activity->code,
                'title' => $activity->title,
                'starts_at' => $activity->starts_at?->toIso8601String(),
            ],
            'summary' => [
                'expected' => $rows->count(),
                'present' => $rows->where('status', 'present')->count(),
                'late' => $rows->where('status', 'late')->count(),
                'excused' => $rows->where('status', 'excused')->count(),
                'absent' => $rows->where('status', 'absent')->count(),
                'not_recorded' => $rows->whereNull('status')->count(),
            ],
            'rows' => $rows->values(),
        ]);
    }

    private function resolveMember(array $validated, Request $request, Activity $activity): Member|JsonResponse
    {
        if (! empty($validated['qr_token'])) {
            $outcome = $this->verification->verify(
                $validated['qr_token'],
                $request,
                $request->user(),
                'attendance',
            );

            if (! $outcome['valid']) {
                return response()->json([
                    'message' => $outcome['message'],
                    'result' => $outcome['result'],
                ], 422);
            }

            $token = QrToken::where('token', $validated['qr_token'])->first();

            return Member::findOrFail($token->member_id);
        }

        if (! empty($validated['member_code'])) {
            $member = Member::where('member_code', $validated['member_code'])->first();

            if (! $member) {
                return response()->json(['message' => 'Aucun membre ne correspond à cet identifiant.'], 404);
            }

            return $member;
        }

        return Member::findOrFail($validated['member_id']);
    }
}
