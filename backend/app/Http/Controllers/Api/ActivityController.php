<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Requests\UpdateActivityRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\MemberResource;
use App\Models\Activity;
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
