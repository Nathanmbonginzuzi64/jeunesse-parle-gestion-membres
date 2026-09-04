<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Enums\MemberStatus;
use App\Enums\Permission;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordAttendanceRequest;
use App\Http\Requests\RecordFingerprintAttendanceRequest;
use App\Http\Resources\AttendanceResource;
use App\Enums\ActivityStatus;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Member;
use App\Models\QrToken;
use App\Services\AuditLogger;
use App\Services\BiometricService;
use App\Services\NotificationService;
use App\Services\VerificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly VerificationService $verification,
        private readonly BiometricService $biometrics,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Historique des présences du membre connecté (self-service portail membre).
     */
    public function forMember(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('member');

        if (! $user->member_id || ! $user->member) {
            abort(403, 'Aucun dossier membre rattaché à ce compte.');
        }

        $member = $user->member;

        if ($member->status !== MemberStatus::Active) {
            abort(403, 'Votre compte membre doit être actif.');
        }

        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:present,absent,late,excused'],
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);

        $base = Attendance::query()
            ->where('member_id', $member->id)
            ->whereHas('activity');

        $summary = [
            'total' => (clone $base)->count(),
            'present' => (clone $base)->where('status', AttendanceStatus::Present)->count(),
            'late' => (clone $base)->where('status', AttendanceStatus::Late)->count(),
            'absent' => (clone $base)->where('status', AttendanceStatus::Absent)->count(),
            'excused' => (clone $base)->where('status', AttendanceStatus::Excused)->count(),
        ];

        $query = Attendance::query()
            ->where('member_id', $member->id)
            ->with([
                'activity:id,code,title,type,starts_at,ends_at,location,status,structure_id',
                'activity.structure:id,name',
                'recorder:id,name',
            ])
            ->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status))
            ->when($filters['q'] ?? null, function (Builder $q, string $search) {
                $q->whereHas('activity', function (Builder $activity) use ($search) {
                    $activity->where('title', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('recorded_at')
            ->orderByDesc('id');

        $page = $query->paginate($perPage);

        $byDate = $page->getCollection()
            ->groupBy(fn (Attendance $row) => optional($row->recorded_at ?? $row->activity?->starts_at)->toDateString() ?? 'inconnu')
            ->map(function ($items, $date) {
                return [
                    'date' => $date,
                    'items' => $items->map(fn (Attendance $row) => $this->serializeMemberAttendance($row))->values(),
                ];
            })
            ->values();

        return response()->json([
            'summary' => $summary,
            'by_date' => $byDate,
            'data' => $page->getCollection()->map(fn (Attendance $row) => $this->serializeMemberAttendance($row))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeMemberAttendance(Attendance $row): array
    {
        $activity = $row->activity;

        return [
            'id' => $row->id,
            'status' => $row->status?->value,
            'status_label' => $row->status?->label(),
            'method' => $row->method,
            'recorded_at' => $row->recorded_at?->toIso8601String(),
            'recorded_by' => $row->recorder?->name,
            'note' => $row->note,
            'activity' => $activity ? [
                'id' => $activity->id,
                'code' => $activity->code,
                'title' => $activity->title,
                'type' => $activity->type instanceof \BackedEnum ? $activity->type->value : $activity->type,
                'starts_at' => $activity->starts_at?->toIso8601String(),
                'ends_at' => $activity->ends_at?->toIso8601String(),
                'location' => $activity->location,
                'status' => $activity->status?->value,
                'status_label' => $activity->status?->label(),
                'structure' => $activity->structure?->name,
            ] : null,
        ];
    }

    /**
     * Présents scannés pour le portail agent : événement(s) en cours + historique paginé par date.
     */
    public function agentPresents(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            ! $user->hasPermission(Permission::AttendanceView)
            && ! $user->hasPermission(Permission::AttendanceRecord)
        ) {
            abort(403, "Vous n'avez pas l'autorisation d'effectuer cette action.");
        }

        $filters = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'date' => ['nullable', 'date'],
            'activity_id' => ['nullable', 'integer', 'exists:activities,id'],
            'mine_only' => ['nullable', 'boolean'],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $mineOnly = $request->boolean('mine_only', true);
        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        $search = isset($filters['q']) ? trim((string) $filters['q']) : '';

        $presentStatuses = [
            AttendanceStatus::Present->value,
            AttendanceStatus::Late->value,
        ];

        $ongoingActivities = Activity::query()
            ->visibleTo($user)
            ->whereIn('status', [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value])
            ->where(function (Builder $q) {
                $q->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now()->addDay())
                    ->orWhere('status', ActivityStatus::Ongoing->value);
            })
            ->with(['structure:id,name', 'organizer:id,name'])
            ->orderBy('starts_at')
            ->limit(20)
            ->get();

        $ongoing = $ongoingActivities->map(function (Activity $activity) use ($user, $mineOnly, $presentStatuses, $search) {
            $base = $activity->attendances()
                ->whereIn('status', $presentStatuses)
                ->when($mineOnly, fn (Builder $q) => $q->where('recorded_by', $user->id))
                ->when($search !== '', function (Builder $q) use ($search) {
                    $term = '%'.mb_strtolower($search).'%';
                    $q->whereHas('member', function (Builder $member) use ($term) {
                        $member->whereRaw('LOWER(member_code) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(first_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(middle_name) LIKE ?', [$term]);
                    });
                });

            $presentCount = (clone $base)->count();

            $presents = (clone $base)
                ->with([
                    'member:id,member_code,last_name,middle_name,first_name,photo_path,structure_id',
                    'member.structure:id,name',
                    'recorder:id,name',
                ])
                ->orderByDesc('recorded_at')
                ->limit(50)
                ->get()
                ->map(fn (Attendance $row) => $this->serializePresentRow($row));

            return [
                'activity' => [
                    'id' => $activity->id,
                    'code' => $activity->code,
                    'title' => $activity->title,
                    'status' => $activity->status?->value,
                    'status_label' => $activity->status?->label(),
                    'starts_at' => $activity->starts_at?->toIso8601String(),
                    'location' => $activity->location,
                    'structure' => $activity->structure?->name,
                ],
                'present_count' => $presentCount,
                'presents' => $presents,
            ];
        })->values();

        $historyQuery = Attendance::query()
            ->whereIn('status', $presentStatuses)
            ->whereHas('activity', fn (Builder $q) => $q->visibleTo($user))
            ->when($mineOnly, fn (Builder $q) => $q->where('recorded_by', $user->id))
            ->when($filters['activity_id'] ?? null, fn (Builder $q, $id) => $q->where('activity_id', $id))
            ->when($filters['date'] ?? null, function (Builder $q) use ($filters) {
                $q->whereDate('recorded_at', Carbon::parse($filters['date'])->toDateString());
            })
            ->when($search !== '', function (Builder $q) use ($search) {
                $term = '%'.mb_strtolower($search).'%';
                $q->whereHas('member', function (Builder $member) use ($term) {
                    $member->whereRaw('LOWER(member_code) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(first_name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(middle_name) LIKE ?', [$term]);
                });
            })
            ->with([
                'member:id,member_code,last_name,middle_name,first_name,photo_path,structure_id',
                'member.structure:id,name',
                'activity:id,code,title,starts_at,location,status,structure_id',
                'activity.structure:id,name',
                'recorder:id,name',
            ])
            ->orderByDesc('recorded_at');

        $history = $historyQuery->paginate($perPage);

        $grouped = $history->getCollection()
            ->groupBy(fn (Attendance $row) => optional($row->recorded_at)->toDateString() ?? 'inconnu')
            ->map(function ($items, $date) {
                return [
                    'date' => $date,
                    'items' => $items->map(fn (Attendance $row) => $this->serializePresentRow($row, true))->values(),
                ];
            })
            ->values();

        return response()->json([
            'ongoing' => $ongoing,
            'by_date' => $grouped,
            'data' => $history->getCollection()->map(fn (Attendance $row) => $this->serializePresentRow($row, true))->values(),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'per_page' => $history->perPage(),
                'total' => $history->total(),
                'mine_only' => $mineOnly,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function serializePresentRow(Attendance $row, bool $withActivity = false): array
    {
        $member = $row->member;

        $payload = [
            'id' => $row->id,
            'status' => $row->status?->value,
            'status_label' => $row->status?->label(),
            'method' => $row->method,
            'recorded_at' => $row->recorded_at?->toIso8601String(),
            'recorded_by' => $row->recorder?->name,
            'member' => $member ? [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'structure' => $member->structure?->name,
                'photo_url' => $member->photo_path
                    ? route('media.member-photo', ['member' => $member->member_code])
                    : null,
            ] : null,
        ];

        if ($withActivity) {
            $activity = $row->activity;
            $payload['activity'] = $activity ? [
                'id' => $activity->id,
                'code' => $activity->code,
                'title' => $activity->title,
                'starts_at' => $activity->starts_at?->toIso8601String(),
                'location' => $activity->location,
                'status' => $activity->status?->value,
                'status_label' => $activity->status?->label(),
                'structure' => $activity->structure?->name,
            ] : null;
        }

        return $payload;
    }

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

        $wasRegistered = $activity->members()->where('members.id', $member->id)->exists();

        $status = AttendanceStatus::from($validated['status'] ?? AttendanceStatus::Present->value);
        $method = ! empty($validated['qr_token']) ? 'qr' : 'manual';

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => $status,
                'method' => $method,
                'recorded_at' => now(),
                'recorded_by' => $request->user()->id,
                'note' => $validated['note'] ?? ($wasRegistered ? null : 'Inscription automatique au pointage'),
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => array_filter([
                'status' => 'confirmed',
                'invited_at' => $wasRegistered ? null : now(),
                'confirmed_at' => now(),
            ], fn ($value) => $value !== null),
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
                'auto_registered' => ! $wasRegistered,
                'recorded_by' => $request->user()->name,
            ],
        );

        $this->notifications->attendanceRecorded($member, $activity, $status->label(), $request->user());
        $this->notifications->adminAttendanceRecorded($member, $activity, $status->label(), $request->user());

        $suffix = $wasRegistered ? '' : ' (inscrit automatiquement)';

        return response()->json([
            'message' => "Présence enregistrée : {$member->full_name} — {$status->label()}{$suffix}.",
            'auto_registered' => ! $wasRegistered,
            'data' => new AttendanceResource($attendance->load(['member', 'recorder'])),
        ], 201);
    }

    /**
     * Auto-pointage du membre connecté (QR de sa carte ou empreinte déjà enrôlée).
     */
    public function storeSelf(Request $request, Activity $activity): JsonResponse
    {
        $user = $request->user()->loadMissing('member.activeCard.activeQrToken');

        if (! $user->member_id || ! $user->member) {
            abort(403, "Aucun dossier membre rattaché à ce compte.");
        }

        $member = $user->member;

        if ($member->status !== MemberStatus::Active) {
            return response()->json(['message' => 'Votre compte membre doit être actif.'], 422);
        }

        if (! in_array($activity->status?->value, [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value], true)) {
            return response()->json(['message' => 'Cette activité n\'accepte plus de pointage.'], 422);
        }

        if (! $activity->members()->where('members.id', $member->id)->exists()) {
            return response()->json(['message' => 'Inscrivez-vous d\'abord à cette activité.'], 422);
        }

        $validated = $request->validate([
            'method' => ['required', 'string', 'in:qr,fingerprint,biometric'],
            'qr_token' => ['nullable', 'string', 'max:255'],
            'template_hash' => ['nullable', 'string', 'min:8', 'max:255'],
            'format' => ['nullable', 'string', 'in:hardware,simulation'],
        ]);

        $method = $validated['method'];
        $note = null;

        if ($method === 'qr') {
            $rawToken = $validated['qr_token']
                ?? $member->activeCard?->activeQrToken?->token;

            if (! $rawToken) {
                return response()->json(['message' => 'Aucun QR actif sur votre carte.'], 422);
            }

            $tokenValue = $this->normalizeQrToken((string) $rawToken);
            $qrToken = QrToken::query()->where('token', $tokenValue)->first();

            if (! $qrToken || (int) $qrToken->member_id !== (int) $member->id) {
                return response()->json(['message' => 'Ce QR ne correspond pas à votre carte.'], 422);
            }

            $outcome = $this->verification->verify($tokenValue, $request, $user, 'attendance');
            if (! $outcome['valid']) {
                return response()->json([
                    'message' => $outcome['message'],
                    'result' => $outcome['result'],
                ], 422);
            }

            $method = 'qr';
            $note = 'Auto-pointage QR (espace membre)';
        } elseif ($method === 'fingerprint') {
            $fingerprintEnrolled = $this->biometrics->countForMember($member) > 0
                || $member->webAuthnCredentials()->exists();

            if (! $fingerprintEnrolled) {
                return response()->json(['message' => 'Aucune empreinte enregistrée pour votre dossier.'], 422);
            }

            if ($this->biometrics->countForMember($member) > 0) {
                try {
                    $this->biometrics->matchMember(
                        $member,
                        $validated['template_hash'] ?? null,
                        $validated['format'] ?? 'hardware',
                    );
                } catch (ValidationException $e) {
                    return response()->json([
                        'message' => collect($e->errors())->flatten()->first() ?? 'Empreinte non reconnue.',
                    ], 422);
                }
            } elseif (empty($validated['template_hash']) && ($validated['format'] ?? null) !== 'simulation') {
                // WebAuthn only : confirmation explicite côté client (biométrie appareil).
                $method = 'fingerprint';
            }

            $method = 'fingerprint';
            $note = 'Auto-pointage empreinte (espace membre)';
        } else {
            // biometric : confirmation si enrôlé (Hello ou templates), sans lecteur téléphone.
            $fingerprintEnrolled = $this->biometrics->countForMember($member) > 0
                || $member->webAuthnCredentials()->exists();

            if (! $fingerprintEnrolled) {
                return response()->json([
                    'message' => 'Enregistrez d\'abord votre empreinte auprès d\'un responsable.',
                ], 422);
            }

            $method = 'fingerprint';
            $note = 'Auto-pointage biométrique (espace membre)';
        }

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => AttendanceStatus::Present,
                'method' => $method,
                'recorded_at' => now(),
                'recorded_by' => $user->id,
                'note' => $note,
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => ['status' => 'confirmed', 'confirmed_at' => now()],
        ]);

        $this->audit->log(
            'attendance.self-recorded',
            $attendance,
            "Auto-présence — {$member->member_code} — {$method} — {$activity->code}",
            [],
            [
                'member_id' => $member->id,
                'activity_id' => $activity->id,
                'method' => $method,
            ],
        );

        $this->notifications->attendanceRecorded($member, $activity, AttendanceStatus::Present->label(), $user);
        $this->notifications->adminAttendanceRecorded($member, $activity, AttendanceStatus::Present->label(), $user);

        return response()->json([
            'message' => 'Présence confirmée.',
            'data' => new AttendanceResource($attendance->load(['member', 'recorder'])),
        ], 201);
    }

    /** Pointage par empreinte digitale (lecteur ou simulation labo). */
    public function storeFingerprint(RecordFingerprintAttendanceRequest $request, Activity $activity): JsonResponse
    {
        $validated = $request->validated();
        $format = $validated['format'] ?? 'hardware';
        $member = null;
        $matchedSlot = null;
        $lab = false;

        if (! empty($validated['member_code'])) {
            $code = mb_strtoupper(trim($validated['member_code']));
            $member = Member::query()->where('member_code', $code)->first();

            if (! $member) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Aucun membre ne correspond à cet identifiant.',
                    'attendance_recorded' => false,
                ], 404);
            }

            if ($this->biometrics->countForMember($member) === 0) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Aucune empreinte enregistrée pour ce membre.',
                    'attendance_recorded' => false,
                    'member_code' => $member->member_code,
                    'full_name' => $member->full_name,
                ], 422);
            }

            try {
                $match = $this->biometrics->matchMember($member, $validated['template_hash'] ?? null, $format);
                $matchedSlot = $match['matched']?->position;
                $lab = $match['lab'];
            } catch (\Illuminate\Validation\ValidationException $e) {
                return response()->json([
                    'valid' => false,
                    'message' => collect($e->errors())->flatten()->first() ?? 'Empreinte non reconnue.',
                    'attendance_recorded' => false,
                    'member_code' => $member->member_code,
                    'full_name' => $member->full_name,
                ], 422);
            }
        } else {
            $memberIds = $activity->members()->pluck('id')->all();

            if ($memberIds === []) {
                $memberIds = Member::query()
                    ->visibleTo($request->user())
                    ->pluck('id')
                    ->all();
            }

            $identified = $this->biometrics->identifyMemberAmong(
                $memberIds,
                $validated['template_hash'] ?? null,
                $format,
            );

            if (! $identified) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Empreinte non reconnue parmi les participants.',
                    'attendance_recorded' => false,
                ], 422);
            }

            $member = $identified['member'];
            $matchedSlot = $identified['matched']->position;
            $lab = $identified['lab'];
        }

        if ($member->status !== MemberStatus::Active) {
            return response()->json([
                'valid' => false,
                'message' => 'Le membre n\'est pas actif — présence refusée.',
                'attendance_recorded' => false,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
            ], 422);
        }

        if (! $member->isVisibleTo($request->user())) {
            return response()->json([
                'valid' => false,
                'message' => 'Ce membre est en dehors de votre zone de responsabilité.',
                'attendance_recorded' => false,
            ], 403);
        }

        $wasRegistered = $activity->members()->where('members.id', $member->id)->exists();

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => AttendanceStatus::Present,
                'method' => 'fingerprint',
                'recorded_at' => now(),
                'recorded_by' => $request->user()->id,
                'note' => $lab
                    ? 'Pointage empreinte (mode labo)'
                    : ($wasRegistered
                        ? 'Pointage empreinte digitale'
                        : 'Inscription + présence automatique (empreinte)'),
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => array_filter([
                'status' => 'confirmed',
                'invited_at' => $wasRegistered ? null : now(),
                'confirmed_at' => now(),
            ], fn ($value) => $value !== null),
        ]);

        $this->audit->log(
            'attendance.recorded',
            $attendance,
            "Présence empreinte — {$member->member_code} — {$activity->code}",
            [],
            [
                'member_id' => $member->id,
                'member_code' => $member->member_code,
                'activity_id' => $activity->id,
                'method' => 'fingerprint',
                'matched_slot' => $matchedSlot,
                'lab' => $lab,
                'auto_registered' => ! $wasRegistered,
            ],
        );

        $this->notifications->attendanceRecorded($member, $activity, AttendanceStatus::Present->label(), $request->user());
        $this->notifications->adminAttendanceRecorded($member, $activity, AttendanceStatus::Present->label(), $request->user());

        $suffix = $wasRegistered ? '' : ' — inscrit automatiquement';

        return response()->json([
            'valid' => true,
            'message' => "Présence enregistrée : {$member->full_name} — empreinte reconnue{$suffix}.",
            'attendance_recorded' => true,
            'auto_registered' => ! $wasRegistered,
            'matched_slot' => $matchedSlot,
            'member_code' => $member->member_code,
            'member_id' => $member->id,
            'full_name' => $member->full_name,
            'photo_url' => $member->photo_path
                ? route('media.member-photo', ['member' => $member->member_code])
                : null,
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

        $recordedOnly = $request->boolean('recorded_only');

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

        if ($recordedOnly) {
            $rows = $rows->filter(fn ($row) => $row['status'] !== null);
        }

        if ($filters['status'] ?? null) {
            if ($filters['status'] === 'not_recorded') {
                $rows = $rows->filter(fn ($row) => $row['status'] === null);
            } elseif ($filters['status'] === 'present') {
                $rows = $rows->filter(fn ($row) => in_array($row['status'], ['present', 'late'], true));
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
            $tokenValue = $this->normalizeQrToken((string) $validated['qr_token']);
            $outcome = $this->verification->verify(
                $tokenValue,
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

            $token = QrToken::where('token', $tokenValue)->first();

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

    private function normalizeQrToken(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return $trimmed;
        }

        if (str_contains($trimmed, '/')) {
            $path = parse_url($trimmed, PHP_URL_PATH);
            if (is_string($path) && $path !== '') {
                return basename($path);
            }
        }

        return $trimmed;
    }
}
