<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreActivityRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\MemberResource;
use App\Models\Activity;
use App\Models\Member;
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
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $activities = Activity::query()
            ->visibleTo($request->user())
            ->with(['province:id,name', 'structure:id,name', 'organizer:id,name'])
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
            ->orderByDesc('starts_at')
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100))
            ->withQueryString();

        return ActivityResource::collection($activities);
    }

    public function store(StoreActivityRequest $request): JsonResponse
    {
        $data = $request->validated();
        $memberIds = $data['member_ids'] ?? [];
        unset($data['member_ids']);

        $activity = DB::transaction(function () use ($data, $memberIds, $request) {
            $activity = Activity::create(array_merge($data, [
                'code' => $this->identifiers->activityCode(),
                'status' => $data['status'] ?? ActivityStatus::Planned->value,
                'organizer_id' => $request->user()->id,
            ]));

            if ($memberIds) {
                $this->attachMembers($activity, $memberIds, $request);
            }

            $this->audit->log('activity.created', $activity, "Création de l'activité {$activity->code}");

            return $activity;
        });

        return response()->json([
            'message' => 'Activité créée.',
            'data' => new ActivityResource($activity->load(['province', 'structure', 'organizer'])->loadCount(['members', 'attendances'])),
        ], 201);
    }

    public function show(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('view', $activity);

        $activity->load(['province', 'city', 'commune', 'structure', 'organizer'])
            ->loadCount(['members', 'attendances']);

        return response()->json([
            'data' => new ActivityResource($activity),
        ]);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        $this->authorize('update', $activity);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['sometimes', Rule::in(ActivityType::values())],
            'status' => ['sometimes', Rule::in(ActivityStatus::values())],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_public' => ['nullable', 'boolean'],
        ]);

        $before = $activity->getAttributes();
        $activity->update($validated);

        $this->audit->logChanges('activity.updated', $activity, $before, "Modification de {$activity->code}");

        return response()->json([
            'message' => 'Activité mise à jour.',
            'data' => new ActivityResource($activity->load(['province', 'structure', 'organizer'])->loadCount(['members', 'attendances'])),
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
