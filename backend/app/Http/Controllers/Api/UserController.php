<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $actor = $request->user();

        $users = User::query()
            ->with(['role', 'province:id,name', 'city:id,name', 'structure:id,name'])
            ->when(! $actor->isNationalScope(), function (Builder $q) use ($actor) {
                match ($actor->scopeLevel()) {
                    1 => $q->where('province_id', $actor->province_id ?? 0),
                    2 => $q->where('city_id', $actor->city_id ?? 0),
                    default => $q->where('structure_id', $actor->structure_id ?? 0),
                };
            })
            ->when($request->input('q'), fn (Builder $q, $v) => $q->where(function (Builder $sub) use ($v) {
                $sub->where('name', 'like', '%'.$v.'%')
                    ->orWhere('email', 'like', '%'.$v.'%')
                    ->orWhere('phone', 'like', '%'.$v.'%');
            }))
            ->when($request->input('role'), fn (Builder $q, $v) => $q->whereHas('role', fn (Builder $r) => $r->where('slug', $v)))
            ->orderBy('name')
            ->paginate(min($request->integer('per_page', 25), 100))
            ->withQueryString();

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $fingerprints = $data['fingerprints'] ?? null;
        unset($data['fingerprints']);

        $user = User::create($data);

        if (is_array($fingerprints) && $fingerprints !== []) {
            app(\App\Services\BiometricService::class)->enrollForUser($user, $fingerprints, $request->user());
        }

        $this->audit->log('user.created', $user, "Création du compte {$user->email}");

        return response()->json([
            'message' => 'Compte créé.',
            'data' => new UserResource($user->load('role')),
        ], 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => new UserResource($user->load(['role', 'province', 'city', 'structure', 'member'])),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:160', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone,'.$user->id],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'structure_id' => ['nullable', 'integer', 'exists:structures,id'],
            'is_active' => ['nullable', 'boolean'],
            'fingerprints' => ['nullable', 'array', 'min:6', 'max:6'],
            'fingerprints.*.slot' => ['required_with:fingerprints', 'string', 'max:40'],
            'fingerprints.*.template_hash' => ['required_with:fingerprints', 'string', 'min:8', 'max:255'],
            'fingerprints.*.captured_at' => ['nullable', 'date'],
        ]);

        $fingerprints = $validated['fingerprints'] ?? null;
        unset($validated['fingerprints']);

        // Une élévation de privilège ne peut pas être obtenue via une simple mise à jour.
        if (isset($validated['role_id'])) {
            $role = Role::find($validated['role_id']);
            $actor = $request->user();

            if ($role && ! $actor->hasRole(\App\Enums\RoleSlug::SuperAdmin) && $role->scope_level < $actor->scopeLevel()) {
                return response()->json([
                    'message' => 'Vous ne pouvez pas attribuer un rôle plus étendu que le vôtre.',
                ], 403);
            }
        }

        $before = $user->getAttributes();
        $user->update($validated);

        if (is_array($fingerprints) && $fingerprints !== []) {
            app(\App\Services\BiometricService::class)->enrollForUser($user, $fingerprints, $request->user());
        }

        $this->audit->logChanges('user.updated', $user, $before, "Modification du compte {$user->email}");

        return response()->json([
            'message' => 'Compte mis à jour.',
            'data' => new UserResource($user->load('role')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->tokens()->delete();
        $user->update(['is_active' => false]);
        $user->delete();

        $this->audit->log('user.deleted', $user, "Désactivation du compte {$user->email}");

        return response()->json(['message' => 'Compte désactivé.']);
    }

    public function roles(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        return response()->json([
            'data' => Role::query()
                ->withCount('users')
                ->orderBy('scope_level')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                    'description' => $role->description,
                    'scope_level' => $role->scope_level,
                    'users_count' => $role->users_count,
                    'permissions' => $role->permissions()->pluck('slug'),
                ]),
        ]);
    }
}
