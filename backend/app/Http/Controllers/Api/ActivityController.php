<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\Permission;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Requests\UpdateActivityRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\MemberResource;
use App\Models\Activity;
use App\Models\ActivityMemberLocation;
use App\Models\Member;
use App\Services\ActivityImageStorageService;
use App\Services\AuditLogger;
use App\Services\IdentifierGenerator;
use App\Services\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    public function __construct(
        private readonly IdentifierGenerator $identifiers,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
        private readonly ActivityImageStorageService $images,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Activity::class);

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'type' => ['nullable', Rule::in(ActivityType::values())],
            'status' => ['nullable', Rule::in(ActivityStatus::values())],
            'province_id' => ['nullable', 'integer'],
            'structure_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'tab' => ['nullable', 'string', 'in:upcoming,completed,drafts'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $activities = Activity::query()
            ->visibleTo($request->user())
            ->with(['province:id,name', 'city:id,name', 'commune:id,name', 'zone:id,name', 'avenue:id,name', 'structure:id,name', 'organizer:id,name'])
            ->withCount(['members', 'attendances'])
            ->when($filters['q'] ?? null, fn (Builder $q, $v) => $q->where(function (Builder $sub) use ($v) {
                $sub->where('title', 'like', '%'.$v.'%')->orWhere('code', 'like', '%'.$v.'%');
            }))
            ->when($filters['type'] ?? null, fn (Builder $q, $v) => $q->where('type', $v))
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('status', $v))
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('province_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('structure_id', $v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->where('starts_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->where('starts_at', '<=', $v))
            ->when(($filters['tab'] ?? null) === 'upcoming', fn (Builder $q) => $q
                ->where('starts_at', '>=', now())
                ->whereIn('status', [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value]))
            ->when(($filters['tab'] ?? null) === 'completed', fn (Builder $q) => $q
                ->where('status', ActivityStatus::Completed->value))
            ->orderByDesc('starts_at')
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100))
            ->withQueryString();

        return ActivityResource::collection($activities);
    }

    /**
     * Catalogue d'activités pour l'app membre (sans permission activities.view).
     */
    public function forMember(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('member');

        if (! $user->member_id || ! $user->member) {
            abort(403, "Aucun dossier membre rattaché à ce compte.");
        }

        if ($user->member->status?->value !== 'active') {
            abort(403, 'Votre compte membre doit être actif.');
        }

        $member = $user->member;
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'tab' => ['nullable', 'string', 'in:upcoming,mine,past'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $tab = $filters['tab'] ?? 'upcoming';

        $query = Activity::query()
            ->where(function (Builder $q) use ($member) {
                $q->where('is_public', true)
                    ->orWhereHas('members', fn (Builder $m) => $m->where('members.id', $member->id));

                if ($member->structure_id) {
                    $q->orWhere('structure_id', $member->structure_id);
                }

                if ($member->province_id) {
                    $q->orWhere('province_id', $member->province_id);
                }
            })
            ->where('status', '!=', ActivityStatus::Cancelled->value)
            ->with(['province:id,name', 'city:id,name', 'structure:id,name'])
            ->withCount(['members', 'attendances'])
            ->when($filters['q'] ?? null, fn (Builder $q, $v) => $q->where(function (Builder $sub) use ($v) {
                $sub->where('title', 'like', '%'.$v.'%')->orWhere('code', 'like', '%'.$v.'%');
            }))
            ->when($tab === 'upcoming', fn (Builder $q) => $q
                ->where('starts_at', '>=', now()->subHours(2))
                ->whereIn('status', [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value])
                ->orderBy('starts_at'))
            ->when($tab === 'past', fn (Builder $q) => $q
                ->where(function (Builder $sub) {
                    $sub->where('starts_at', '<', now())
                        ->orWhere('status', ActivityStatus::Completed->value);
                })
                ->orderByDesc('starts_at'))
            ->when($tab === 'mine', fn (Builder $q) => $q
                ->whereHas('members', fn (Builder $m) => $m->where('members.id', $member->id))
                ->orderByDesc('starts_at'));

        if (! in_array($tab, ['upcoming', 'past', 'mine'], true)) {
            $query->orderByDesc('starts_at');
        }

        $activities = $query
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100))
            ->withQueryString();

        $activityIds = $activities->getCollection()->pluck('id');
        $registeredIds = $activityIds->isEmpty()
            ? []
            : DB::table('activity_member')
                ->where('member_id', $member->id)
                ->whereIn('activity_id', $activityIds)
                ->pluck('activity_id')
                ->all();
        $registeredLookup = array_fill_keys($registeredIds, true);

        return response()->json([
            'data' => $activities->getCollection()->map(function (Activity $activity) use ($registeredLookup) {
                return (new ActivityResource($activity))->additional([])->resolve() + [
                    'is_registered' => isset($registeredLookup[$activity->id]),
                ];
            })->values(),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /** Inscription volontaire du membre connecté à une activité. */
    public function registerSelf(Request $request, Activity $activity): JsonResponse
    {
        $user = $request->user()->loadMissing('member');

        if (! $user->member_id || ! $user->member) {
            abort(403, "Aucun dossier membre rattaché à ce compte.");
        }

        $member = $user->member;

        if ($member->status?->value !== 'active') {
            return response()->json(['message' => 'Votre compte membre doit être actif.'], 422);
        }

        if (in_array($activity->status?->value, [ActivityStatus::Cancelled->value], true)) {
            return response()->json(['message' => 'Cette activité n\'est pas ouverte aux inscriptions.'], 422);
        }

        $allowed = $activity->is_public
            || ($member->structure_id && (int) $activity->structure_id === (int) $member->structure_id)
            || ($member->province_id && (int) $activity->province_id === (int) $member->province_id)
            || $activity->members()->where('members.id', $member->id)->exists();

        if (! $allowed) {
            abort(403, 'Cette activité n\'est pas disponible pour votre périmètre.');
        }

        if ($activity->capacity) {
            $count = $activity->members()->count();
            if ($count >= $activity->capacity && ! $activity->members()->where('members.id', $member->id)->exists()) {
                return response()->json(['message' => 'Capacité maximale atteinte.'], 422);
            }
        }

        $activity->members()->syncWithoutDetaching([
            $member->id => [
                'status' => 'confirmed',
                'invited_at' => now(),
                'confirmed_at' => now(),
            ],
        ]);

        $this->audit->log('activity.self-registered', $activity, "Inscription mobile de {$member->member_code}");

        return response()->json([
            'message' => 'Inscription enregistrée.',
            'data' => (new ActivityResource(
                $activity->fresh()->load(['province:id,name', 'city:id,name', 'structure:id,name'])->loadCount(['members', 'attendances'])
            ))->resolve() + ['is_registered' => true],
        ]);
    }

    /** Détail d'une activité pour le membre connecté (présence + QR + biométrie). */
    public function showForMember(Request $request, Activity $activity): JsonResponse
    {
        $user = $request->user()->loadMissing('member.activeCard.activeQrToken');

        if (! $user->member_id || ! $user->member) {
            abort(403, "Aucun dossier membre rattaché à ce compte.");
        }

        $member = $user->member;

        if ($member->status?->value !== 'active') {
            abort(403, 'Votre compte membre doit être actif.');
        }

        $allowed = $activity->is_public
            || ($member->structure_id && (int) $activity->structure_id === (int) $member->structure_id)
            || ($member->province_id && (int) $activity->province_id === (int) $member->province_id)
            || $activity->members()->where('members.id', $member->id)->exists();

        if (! $allowed || $activity->status === ActivityStatus::Cancelled) {
            abort(404, 'Activité introuvable.');
        }

        $activity->load(['province:id,name', 'city:id,name', 'structure:id,name', 'organizer:id,name', 'liveSharer:id,name'])
            ->loadCount(['members', 'attendances']);

        $isRegistered = $activity->members()->where('members.id', $member->id)->exists();
        $attendance = $activity->attendances()->where('member_id', $member->id)->first();

        $fingerprintEnrolled = $member->webAuthnCredentials()->exists()
            || $member->biometricTemplates()
                ->where('modality', 'fingerprint')
                ->where('status', 'enrolled')
                ->exists();

        $card = $member->activeCard;
        $token = $card?->activeQrToken;
        $qrCodes = app(\App\Services\QrCodeService::class);

        // Garantit un jeton QR actif si la carte existe mais n'en a plus.
        if ($card && ! $token) {
            $token = $qrCodes->issueForCard($card);
            $card->setRelation('activeQrToken', $token);
        }

        $canCheckIn = $isRegistered
            && in_array($activity->status?->value, [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value], true)
            && (! $attendance || $attendance->status?->value !== 'present');

        $verificationUrl = $token ? $qrCodes->verificationUrl($token->token) : null;

        $memberLocation = ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->where('member_id', $member->id)
            ->first();

        return response()->json([
            'data' => (new ActivityResource($activity))->resolve() + [
                'is_registered' => $isRegistered,
                'fingerprint_enrolled' => $fingerprintEnrolled,
                'can_check_in' => $canCheckIn,
                'member_location_sharing' => (bool) ($memberLocation?->sharing_active),
                'member_location' => $memberLocation && $memberLocation->sharing_active ? [
                    'latitude' => $memberLocation->latitude,
                    'longitude' => $memberLocation->longitude,
                    'updated_at' => $memberLocation->updated_at?->toIso8601String(),
                ] : null,
                'attendance' => $attendance ? [
                    'id' => $attendance->id,
                    'status' => $attendance->status?->value,
                    'status_label' => $attendance->status?->label(),
                    'method' => $attendance->method,
                    'recorded_at' => $attendance->recorded_at?->toIso8601String(),
                ] : null,
                'qr' => $token ? [
                    'token' => $token->token,
                    'verification_url' => $verificationUrl,
                    'qr_svg' => $verificationUrl ? $qrCodes->renderDataUri($verificationUrl) : null,
                ] : null,
            ],
        ]);
    }

    /**
     * Liste allégée pour le pointage (agents de vérification inclus).
     * N'exige pas activities.view — uniquement attendance.view|record + périmètre.
     */
    public function forAttendance(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        if (
            ! $user->hasPermission(Permission::AttendanceView)
            && ! $user->hasPermission(Permission::AttendanceRecord)
        ) {
            abort(403, "Vous n'avez pas l'autorisation d'effectuer cette action.");
        }

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $activities = Activity::query()
            ->visibleTo($user)
            ->whereIn('status', [ActivityStatus::Planned->value, ActivityStatus::Ongoing->value])
            ->with(['province:id,name', 'city:id,name', 'structure:id,name'])
            ->withCount(['members', 'attendances'])
            ->when($filters['q'] ?? null, fn (Builder $q, $v) => $q->where(function (Builder $sub) use ($v) {
                $sub->where('title', 'like', '%'.$v.'%')->orWhere('code', 'like', '%'.$v.'%');
            }))
            ->orderByDesc('starts_at')
            ->paginate(min((int) ($filters['per_page'] ?? 30), 100))
            ->withQueryString();

        return ActivityResource::collection($activities);
    }

    public function store(StoreActivityRequest $request): JsonResponse
    {
        $data = $request->validated();
        $memberIds = $data['member_ids'] ?? [];
        unset($data['member_ids'], $data['image']);

        $activity = DB::transaction(function () use ($data, $memberIds, $request) {
            $activity = Activity::create(array_merge($data, [
                'code' => $this->identifiers->activityCode(),
                'status' => $data['status'] ?? ActivityStatus::Planned->value,
                'organizer_id' => $request->user()->id,
            ]));

            if ($request->hasFile('image')) {
                $activity->update([
                    'image_path' => $this->images->store($request->file('image'), $activity->code),
                ]);
            }

            if ($memberIds) {
                $this->attachMembers($activity, $memberIds, $request);
            }

            $this->audit->log('activity.created', $activity, "Création de l'activité {$activity->code}");

            return $activity;
        });

        $this->notifications->adminNewActivity($activity, $request->user());

        return response()->json([
            'message' => 'Activité créée.',
            'data' => new ActivityResource($activity->load(['province', 'city', 'commune', 'zone', 'avenue', 'structure', 'organizer', 'liveSharer'])->loadCount(['members', 'attendances'])),
        ], 201);
    }

    public function show(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('view', $activity);

        $activity->load(['province', 'city', 'commune', 'zone', 'avenue', 'structure', 'organizer', 'liveSharer'])
            ->loadCount(['members', 'attendances']);

        return response()->json([
            'data' => new ActivityResource($activity),
        ]);
    }

    public function update(UpdateActivityRequest $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        $validated = $request->validated();
        unset($validated['image'], $validated['member_ids']);

        $before = $activity->getAttributes();
        $activity->update($validated);

        if ($request->hasFile('image')) {
            $activity->update([
                'image_path' => $this->images->store(
                    $request->file('image'),
                    $activity->code,
                    $activity->image_path,
                ),
            ]);
        }

        $changes = [];
        if ($activity->wasChanged('starts_at') && $activity->starts_at) {
            $changes['date'] = $activity->starts_at->translatedFormat('d F Y à H:i');
        }
        if ($activity->wasChanged('location') && $activity->location) {
            $changes['lieu'] = $activity->location;
        }

        if ($changes !== []) {
            $activity->load('members');
            foreach ($activity->members as $member) {
                $this->notifications->activityUpdated($member, $activity, $changes, $request->user());
            }
        }

        $this->audit->logChanges('activity.updated', $activity, $before, "Modification de {$activity->code}");

        return response()->json([
            'message' => 'Activité mise à jour.',
            'data' => new ActivityResource($activity->load(['province', 'city', 'commune', 'zone', 'avenue', 'structure', 'organizer', 'liveSharer'])->loadCount(['members', 'attendances'])),
        ]);
    }

    public function destroy(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('delete', $activity);

        $activity->delete();

        $this->audit->log('activity.deleted', $activity, "Suppression de {$activity->code}");

        return response()->json(['message' => 'Activité supprimée.']);
    }

    public function participants(Request $request, Activity $activity): AnonymousResourceCollection
    {
        $this->authorize('view', $activity);

        $members = $activity->members()
            ->with(['province:id,name', 'structure:id,name'])
            ->orderBy('last_name')
            ->paginate(min($request->integer('per_page', 50), 200));

        return MemberResource::collection($members);
    }

    public function addParticipants(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        $validated = $request->validate([
            'member_ids' => ['required', 'array', 'min:1', 'max:5000'],
            'member_ids.*' => ['integer', 'exists:members,id'],
        ]);

        $added = $this->attachMembers($activity, $validated['member_ids'], $request);

        return response()->json([
            'message' => $added.' participant(s) ajouté(s).',
            'added' => $added,
        ]);
    }

    public function removeParticipant(Request $request, Activity $activity, Member $member): JsonResponse
    {
        $this->authorize('update', $activity);

        $activity->members()->detach($member->id);

        return response()->json(['message' => 'Participant retiré.']);
    }

    public function startLiveLocation(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $activity->update([
            'live_location_active' => true,
            'live_latitude' => $validated['latitude'],
            'live_longitude' => $validated['longitude'],
            'live_updated_at' => now(),
            'live_shared_by' => $request->user()->id,
        ]);

        $this->notifyLiveLocation($activity, 'start');

        $this->audit->log('activity.live_location.started', $activity, "Partage GPS activé — {$activity->code}");

        return response()->json([
            'message' => 'Localisation partagée en temps réel.',
            'data' => new ActivityResource($activity->load(['liveSharer'])),
        ]);
    }

    public function updateLiveLocation(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        abort_unless($activity->live_location_active, 422, 'Le partage GPS n\'est pas actif.');

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $activity->update([
            'live_latitude' => $validated['latitude'],
            'live_longitude' => $validated['longitude'],
            'live_updated_at' => now(),
            'live_shared_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Position mise à jour.',
            'data' => new ActivityResource($activity->load(['liveSharer'])),
        ]);
    }

    public function stopLiveLocation(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        $activity->update([
            'live_location_active' => false,
            'live_updated_at' => now(),
        ]);

        $this->audit->log('activity.live_location.stopped', $activity, "Partage GPS arrêté — {$activity->code}");

        return response()->json(['message' => 'Partage de localisation arrêté.']);
    }

    public function liveLocation(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('view', $activity);

        $activity->loadMissing('liveSharer:id,name');

        return response()->json([
            'activity_id' => $activity->id,
            'venue' => [
                'latitude' => $activity->latitude,
                'longitude' => $activity->longitude,
                'location' => $activity->location,
            ],
            'live' => [
                'active' => (bool) $activity->live_location_active,
                'latitude' => $activity->live_latitude,
                'longitude' => $activity->live_longitude,
                'updated_at' => $activity->live_updated_at?->toIso8601String(),
                'shared_by' => $activity->liveSharer?->name,
            ],
        ]);
    }

    /** Snapshot live pour le membre (sans activities.view). */
    public function liveLocationForMember(Request $request, Activity $activity): JsonResponse
    {
        $user = $request->user()->loadMissing('member');

        if (! $user->member_id || ! $user->member) {
            abort(403, 'Aucun dossier membre rattaché à ce compte.');
        }

        $member = $user->member;

        if ($member->status?->value !== 'active') {
            abort(403, 'Votre compte membre doit être actif.');
        }

        $allowed = $activity->is_public
            || ($member->structure_id && (int) $activity->structure_id === (int) $member->structure_id)
            || ($member->province_id && (int) $activity->province_id === (int) $member->province_id)
            || $activity->members()->where('members.id', $member->id)->exists();

        if (! $allowed || $activity->status === ActivityStatus::Cancelled) {
            abort(404, 'Activité introuvable.');
        }

        $activity->loadMissing('liveSharer:id,name');

        $own = ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->where('member_id', $member->id)
            ->first();

        return response()->json([
            'activity_id' => $activity->id,
            'venue' => [
                'latitude' => $activity->latitude,
                'longitude' => $activity->longitude,
                'location' => $activity->location,
            ],
            'live' => [
                'active' => (bool) $activity->live_location_active,
                'latitude' => $activity->live_latitude,
                'longitude' => $activity->live_longitude,
                'updated_at' => $activity->live_updated_at?->toIso8601String(),
                'shared_by' => $activity->liveSharer?->name,
            ],
            'member_location_sharing' => (bool) ($own?->sharing_active),
            'member_location' => $own && $own->sharing_active ? [
                'latitude' => $own->latitude,
                'longitude' => $own->longitude,
                'updated_at' => $own->updated_at?->toIso8601String(),
            ] : null,
        ]);
    }

    public function startMemberLocation(Request $request, Activity $activity): JsonResponse
    {
        $member = $this->requireActiveRegisteredMember($request, $activity);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $row = ActivityMemberLocation::query()->updateOrCreate(
            [
                'activity_id' => $activity->id,
                'member_id' => $member->id,
            ],
            [
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
                'sharing_active' => true,
                'arrived_at' => null,
                'updated_at' => now(),
            ],
        );

        $arrived = $this->markMemberArrivedIfNear($activity, $row, (float) $validated['latitude'], (float) $validated['longitude']);

        if ($arrived) {
            $this->notifications->adminMemberEnRoute($member, $activity, 'arrived');
        } else {
            $this->notifications->adminMemberEnRoute($member, $activity, 'en_route');
        }

        return response()->json([
            'message' => $arrived
                ? 'Vous êtes arrivé près du lieu de l\'activité.'
                : 'Votre position est partagée avec les organisateurs.',
            'data' => [
                'sharing_active' => (bool) $row->fresh()->sharing_active,
                'arrived' => $arrived,
                'latitude' => $row->latitude,
                'longitude' => $row->longitude,
                'updated_at' => $row->fresh()->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function updateMemberLocation(Request $request, Activity $activity): JsonResponse
    {
        $member = $this->requireActiveRegisteredMember($request, $activity);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $row = ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->where('member_id', $member->id)
            ->where('sharing_active', true)
            ->first();

        abort_unless($row, 422, 'Le partage de position n\'est pas actif. Activez-le d\'abord.');

        $row->update([
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'updated_at' => now(),
        ]);

        $arrived = $this->markMemberArrivedIfNear($activity, $row, (float) $validated['latitude'], (float) $validated['longitude']);

        if ($arrived) {
            $this->notifications->adminMemberEnRoute($member, $activity, 'arrived');
        }

        return response()->json([
            'message' => $arrived ? 'Vous êtes arrivé près du lieu de l\'activité.' : 'Position mise à jour.',
            'data' => [
                'sharing_active' => (bool) $row->fresh()->sharing_active,
                'arrived' => $arrived,
                'latitude' => $row->latitude,
                'longitude' => $row->longitude,
                'updated_at' => $row->fresh()->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function stopMemberLocation(Request $request, Activity $activity): JsonResponse
    {
        $member = $this->requireActiveRegisteredMember($request, $activity);

        ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->where('member_id', $member->id)
            ->update([
                'sharing_active' => false,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Partage de position arrêté.']);
    }

    /** Membres en route (partage GPS actif) — organisateurs. */
    public function membersEnRoute(Request $request, Activity $activity): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasPermission(Permission::ActivitiesManage)
            || $user->hasPermission(Permission::AttendanceView),
            403,
            "Vous n'avez pas l'autorisation d'effectuer cette action."
        );
        abort_unless($activity->isVisibleTo($user), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        $memberRelations = [
            'member:id,member_code,first_name,middle_name,last_name,photo_path,structure_id,province_id,commune_id',
            'member.structure:id,name',
            'member.province:id,name',
            'member.commune:id,name',
            'member.activeCard:id,member_id,card_number,status',
        ];

        $rows = ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->where('sharing_active', true)
            ->with($memberRelations)
            ->orderByDesc('updated_at')
            ->get();

        $arrivals = ActivityMemberLocation::query()
            ->where('activity_id', $activity->id)
            ->whereNotNull('arrived_at')
            ->where('arrived_at', '>=', now()->subMinutes(45))
            ->with($memberRelations)
            ->orderByDesc('arrived_at')
            ->get();

        $mapRow = function (ActivityMemberLocation $row, bool $arrived = false) {
            $m = $row->member;

            return [
                'member_id' => $m?->id,
                'member_code' => $m?->member_code,
                'full_name' => $m?->full_name,
                'photo_url' => $m?->photo_path
                    ? route('media.member-photo', ['member' => $m->member_code])
                    : null,
                'card_number' => $m?->activeCard?->card_number,
                'structure' => $m?->structure?->name,
                'province' => $m?->province?->name,
                'commune' => $m?->commune?->name,
                'latitude' => $row->latitude,
                'longitude' => $row->longitude,
                'updated_at' => $row->updated_at?->toIso8601String(),
                'arrived_at' => $row->arrived_at?->toIso8601String(),
                'status' => $arrived ? 'arrived' : 'en_route',
            ];
        };

        return response()->json([
            'activity_id' => $activity->id,
            'total' => $rows->count(),
            'data' => $rows->map(fn (ActivityMemberLocation $row) => $mapRow($row, false))->values(),
            'arrivals' => $arrivals->map(fn (ActivityMemberLocation $row) => $mapRow($row, true))->values(),
        ]);
    }

    private function markMemberArrivedIfNear(
        Activity $activity,
        ActivityMemberLocation $row,
        float $lat,
        float $lng,
    ): bool {
        $targets = [];
        if ($activity->latitude != null && $activity->longitude != null) {
            $targets[] = [(float) $activity->latitude, (float) $activity->longitude];
        }
        if ($activity->live_location_active && $activity->live_latitude != null && $activity->live_longitude != null) {
            $targets[] = [(float) $activity->live_latitude, (float) $activity->live_longitude];
        }

        if ($targets === []) {
            return false;
        }

        $near = false;
        foreach ($targets as [$tLat, $tLng]) {
            if ($this->distanceMeters($lat, $lng, $tLat, $tLng) <= 120) {
                $near = true;
                break;
            }
        }

        if (! $near) {
            return false;
        }

        $row->update([
            'sharing_active' => false,
            'arrived_at' => now(),
            'latitude' => $lat,
            'longitude' => $lng,
            'updated_at' => now(),
        ]);

        return true;
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earth = 6371000.0;
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $dPhi = deg2rad($lat2 - $lat1);
        $dLambda = deg2rad($lng2 - $lng1);
        $a = sin($dPhi / 2) ** 2 + cos($phi1) * cos($phi2) * sin($dLambda / 2) ** 2;

        return 2 * $earth * asin(min(1, sqrt($a)));
    }

    private function requireActiveRegisteredMember(Request $request, Activity $activity): Member
    {
        $user = $request->user()->loadMissing('member');

        if (! $user->member_id || ! $user->member) {
            abort(403, 'Aucun dossier membre rattaché à ce compte.');
        }

        $member = $user->member;

        if ($member->status?->value !== 'active') {
            abort(403, 'Votre compte membre doit être actif.');
        }

        abort_unless(
            $activity->members()->where('members.id', $member->id)->exists(),
            403,
            'Vous devez être inscrit à cette activité pour partager votre position.'
        );

        return $member;
    }

    private function notifyLiveLocation(Activity $activity, string $event): void
    {
        $members = $activity->members()->whereNotNull('user_id')->get();

        foreach ($members as $member) {
            $this->notifications->liveLocationAvailable($member, $activity);
        }
    }

    /**
     * Rattache des membres à une activité en ignorant silencieusement ceux qui
     * sortent du périmètre de l'utilisateur.
     */
    private function attachMembers(Activity $activity, array $memberIds, Request $request): int
    {
        $allowed = Member::query()
            ->visibleTo($request->user())
            ->whereIn('id', $memberIds)
            ->pluck('id');

        $payload = $allowed->mapWithKeys(fn (int $id) => [
            $id => ['status' => 'invited', 'invited_at' => now()],
        ])->all();

        $result = $activity->members()->syncWithoutDetaching($payload);

        foreach (Member::whereIn('id', $result['attached'] ?? [])->get() as $member) {
            $this->notifications->activityInvitation($member, $activity);
        }

        return count($result['attached'] ?? []);
    }
}
