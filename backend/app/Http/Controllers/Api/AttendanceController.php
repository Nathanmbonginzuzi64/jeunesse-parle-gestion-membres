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
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            "Validation présence — {$member->member_code} — {$status->label()} ({$method}) — {$activity->code}",
            [],
            [
                'member_id' => $member->id,
                'member_code' => $member->member_code,
                'activity_id' => $activity->id,
                'method' => $method,
                'recorded_by' => $request->user()->name,
            ],
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

        $activity->loadMissing('organizer');

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:present,absent,late,excused,not_recorded'],
            'method' => ['nullable', 'string', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);

        $attendances = $activity->attendances()->with('recorder:id,name')->get()->keyBy('member_id');

        $query = $activity->members()
            ->with(['structure:id,name', 'province:id,name', 'commune:id,name', 'activeCard'])
            ->orderBy('last_name');

        if ($filters['q'] ?? null) {
            $q = $filters['q'];
            $query->where(function ($builder) use ($q) {
                $builder->where('member_code', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('first_name', 'like', "%{$q}%");
            });
        }

        $members = $query->get();

        $rows = $members->map(function (Member $member) use ($attendances) {
            $attendance = $attendances->get($member->id);

            return [
                'member_id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'structure' => $member->structure?->name,
                'province' => $member->province?->name,
                'commune' => $member->commune?->name,
                'member_status' => $member->status->value,
                'member_status_label' => $member->status->label(),
                'card_valid' => $member->activeCard?->status->value === 'active',
                'photo_url' => $member->photo_path ? route('media.member-photo', ['member' => $member->member_code]) : null,
                'status' => $attendance?->status->value,
                'status_label' => $attendance?->status->label(),
                'method' => $attendance?->method,
                'recorded_at' => $attendance?->recorded_at?->toIso8601String(),
                'recorded_by' => $attendance?->recorder?->name,
            ];
        });

        if ($filters['status'] ?? null) {
            if ($filters['status'] === 'not_recorded') {
                $rows = $rows->filter(fn ($row) => $row['status'] === null);
            } else {
                $rows = $rows->filter(fn ($row) => $row['status'] === $filters['status']);
            }
        }

        if ($filters['method'] ?? null) {
            $rows = $rows->filter(fn ($row) => $row['method'] === $filters['method']);
        }

        $total = $rows->count();
        $page = max(1, (int) ($filters['page'] ?? 1));
        $paginated = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        $allRows = $members->map(function (Member $member) use ($attendances) {
            $attendance = $attendances->get($member->id);

            return ['status' => $attendance?->status->value];
        });

        return response()->json([
            'activity' => [
                'id' => $activity->id,
                'code' => $activity->code,
                'title' => $activity->title,
                'starts_at' => $activity->starts_at?->toIso8601String(),
                'location' => $activity->location,
                'image_url' => $activity->image_path
                    ? route('media.activity-image', ['activity' => $activity->code])
                    : null,
                'organizer' => $activity->organizer?->name,
            ],
            'summary' => [
                'expected' => $allRows->count(),
                'present' => $allRows->where('status', 'present')->count(),
                'late' => $allRows->where('status', 'late')->count(),
                'excused' => $allRows->where('status', 'excused')->count(),
                'absent' => $allRows->where('status', 'absent')->count(),
                'not_recorded' => $allRows->whereNull('status')->count(),
            ],
            'rows' => $paginated,
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /** Export CSV de la feuille de présence. */
    public function exportSheet(Request $request, Activity $activity): StreamedResponse
    {
        $this->authorize('viewAttendance', $activity);

        $this->audit->log('attendance.exported', $activity, "Export feuille — {$activity->code}");

        $filename = 'presence-'.$activity->code.'-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($activity) {
            $handle = fopen('php://output', 'wb');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['ID membre', 'Nom', 'Structure', 'Statut', 'Méthode', 'Enregistré le', 'Par'], ';');

            $attendances = $activity->attendances()->with('recorder:id,name')->get()->keyBy('member_id');

            $activity->members()->with('structure:id,name')->orderBy('last_name')->chunk(500, function ($members) use ($handle, $attendances) {
                foreach ($members as $member) {
                    $attendance = $attendances->get($member->id);
                    fputcsv($handle, [
                        $member->member_code,
                        $member->full_name,
                        $member->structure?->name,
                        $attendance?->status?->label() ?? 'Non pointé',
                        $attendance?->method,
                        $attendance?->recorded_at?->format('d/m/Y H:i'),
                        $attendance?->recorder?->name,
                    ], ';');
                }
            });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
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
