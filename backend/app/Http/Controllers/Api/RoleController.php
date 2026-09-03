<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission as PermissionEnum;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function catalog(): JsonResponse
    {
        return response()->json([
            'data' => collect(PermissionEnum::cases())->map(fn (PermissionEnum $permission) => [
                'slug' => $permission->value,
                'name' => $permission->label(),
                'group' => $permission->group(),
            ])->values(),
        ]);
    }

    public function updatePermissions(Request $request, Role $role): JsonResponse
    {
        $this->guardMutable($role);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::in(PermissionEnum::values())],
        ]);

        $slugs = collect($validated['permissions'])->unique()->values();

        if ($request->user()->role_id === $role->id && ! $slugs->contains(PermissionEnum::RolesManage->value)) {
            abort(422, 'Vous ne pouvez pas retirer « gérer les rôles » de votre propre profil.');
        }

        $ids = Permission::query()->whereIn('slug', $slugs)->pluck('id');
        $role->permissions()->sync($ids);

        $this->audit->log('role.permissions-updated', $role, "Permissions du rôle {$role->slug}");

        return response()->json([
            'message' => 'Permissions mises à jour.',
            'data' => $this->serialize($role->fresh()),
        ]);
    }

    public function detachPermission(Request $request, Role $role, string $permission): JsonResponse
    {
        $this->guardMutable($role);

        abort_unless(in_array($permission, PermissionEnum::values(), true), 404, 'Permission inconnue.');

        if (
            $request->user()->role_id === $role->id
            && $permission === PermissionEnum::RolesManage->value
        ) {
            abort(422, 'Vous ne pouvez pas retirer « gérer les rôles » de votre propre profil.');
        }

        $record = Permission::query()->where('slug', $permission)->firstOrFail();
        $role->permissions()->detach($record->id);

        $this->audit->log('role.permission-removed', $role, "Retrait de {$permission} sur {$role->slug}");

        return response()->json([
            'message' => 'Permission retirée.',
            'data' => $this->serialize($role->fresh()),
        ]);
    }

    private function guardMutable(Role $role): void
    {
        if ($role->slug === RoleSlug::SuperAdmin->value) {
            abort(422, 'Les droits du super administrateur ne peuvent pas être modifiés.');
        }
    }

    private function serialize(Role $role): array
    {
        $role->loadCount('users');

        return [
            'id' => $role->id,
            'slug' => $role->slug,
            'name' => $role->name,
            'description' => $role->description,
            'scope_level' => $role->scope_level,
            'is_system' => $role->is_system,
            'users_count' => $role->users_count,
            'permissions' => $role->permissions()->pluck('slug'),
        ];
    }
}
