<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Enums\RoleSlug;
use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::UsersView);
    }

    public function view(User $user, User $target): bool
    {
        return $user->id === $target->id
            || ($user->hasPermission(Permission::UsersView) && $this->inScope($user, $target));
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::UsersManage);
    }

    public function update(User $user, User $target): bool
    {
        // Seul un super administrateur peut modifier un autre super administrateur.
        if ($target->hasRole(RoleSlug::SuperAdmin) && ! $user->hasRole(RoleSlug::SuperAdmin)) {
            return false;
        }

        return $user->hasPermission(Permission::UsersManage) && $this->inScope($user, $target);
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->id === $target->id) {
            return false;
        }

        return $this->update($user, $target);
    }

    /** Un compte ne peut jamais recevoir un périmètre plus large que celui de son créateur. */
    private function inScope(User $user, User $target): bool
    {
        return match ($user->scopeLevel()) {
            0 => true,
            1 => $user->province_id !== null && $target->province_id === $user->province_id,
            2 => $user->city_id !== null && $target->city_id === $user->city_id,
            3 => $user->structure_id !== null && $target->structure_id === $user->structure_id,
            default => false,
        };
    }
}
