<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\BiometricService;
use App\Services\ContextualBiometricService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly BiometricService $biometrics,
        private readonly ContextualBiometricService $contextualBiometrics,
    ) {}

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
        $webauthnEnrollment = $data['webauthn_enrollment'] ?? null;
        unset($data['fingerprints'], $data['webauthn_enrollment'], $data['fingerprint_enrollment']);

        $user = DB::transaction(function () use ($data, $fingerprints, $webauthnEnrollment, $request) {
            $user = User::create($data);

            if (is_array($fingerprints) && $fingerprints !== []) {
                $this->biometrics->enrollForUser($user, $fingerprints, $request->user());
            }

            if (is_array($webauthnEnrollment) && $webauthnEnrollment !== []) {
                $this->contextualBiometrics->completeUserEnrollment($user, (object) $webauthnEnrollment, $request);
            }

            return $user;
        });

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

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $validated = $request->validated();

        $fingerprints = $validated['fingerprints'] ?? null;
        $webauthnEnrollment = $validated['webauthn_enrollment'] ?? null;
        $disableBiometry = ($validated['fingerprint_enrollment'] ?? null) === '0';
        unset($validated['fingerprints'], $validated['webauthn_enrollment'], $validated['fingerprint_enrollment']);

        $before = $user->getAttributes();

        DB::transaction(function () use ($user, $validated, $fingerprints, $webauthnEnrollment, $disableBiometry, $request) {
            $user->update($validated);

            if (is_array($fingerprints) && $fingerprints !== []) {
                $this->biometrics->enrollForUser($user, $fingerprints, $request->user());
            }

            if (is_array($webauthnEnrollment) && $webauthnEnrollment !== []) {
                $this->contextualBiometrics->completeUserEnrollment($user, (object) $webauthnEnrollment, $request);
            } elseif ($disableBiometry) {
                $this->contextualBiometrics->revokeUserCredentials($user);
            }
        });

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
