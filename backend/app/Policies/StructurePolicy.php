<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Structure;
use App\Models\User;

class StructurePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::StructuresView);
    }

    public function view(User $user, Structure $structure): bool
    {
        return $user->hasPermission(Permission::StructuresView) && $this->inScope($user, $structure);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::StructuresManage);
    }

    public function update(User $user, Structure $structure): bool
    {
        return $user->hasPermission(Permission::StructuresManage) && $this->inScope($user, $structure);
    }

    public function delete(User $user, Structure $structure): bool
    {
        return $user->hasPermission(Permission::StructuresManage) && $this->inScope($user, $structure);
    }

    private function inScope(User $user, Structure $structure): bool
    {
        return match ($user->scopeLevel()) {
            0 => true,
            1 => $user->province_id !== null && $structure->province_id === $user->province_id,
            2 => $user->city_id !== null && $structure->city_id === $user->city_id,
            3 => $user->structure_id !== null && $structure->id === $user->structure_id,
            default => false,
        };
    }
}
