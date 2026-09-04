<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Member;
use App\Models\User;

class MemberPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::MembersView);
    }

    /**
     * Deux portes doivent s'ouvrir : la permission fonctionnelle et l'appartenance
     * du membre au périmètre territorial du compte.
     */
    public function view(User $user, Member $member): bool
    {
        if ($member->isOwnedBy($user)) {
            return true;
        }

        return $user->hasPermission(Permission::MembersView) && $member->isVisibleTo($user);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::MembersCreate);
    }

    public function update(User $user, Member $member): bool
    {
        if ($member->isOwnedBy($user)) {
            return true;
        }

        return $user->hasPermission(Permission::MembersUpdate) && $member->isVisibleTo($user);
    }

    public function delete(User $user, Member $member): bool
    {
        return $user->hasPermission(Permission::MembersDelete) && $member->isVisibleTo($user);
    }

    public function validate(User $user, Member $member): bool
    {
        return $user->hasPermission(Permission::MembersValidate) && $member->isVisibleTo($user);
    }

    public function changeStatus(User $user, Member $member): bool
    {
        return $user->hasPermission(Permission::MembersChangeStatus) && $member->isVisibleTo($user);
    }

    public function export(User $user): bool
    {
        return $user->hasPermission(Permission::MembersExport);
    }

    public function viewSensitive(User $user, Member $member): bool
    {
        if ($member->isOwnedBy($user)) {
            return true;
        }

        return $user->hasPermission(Permission::MembersViewSensitive) && $member->isVisibleTo($user);
    }

    public function manageCard(User $user, Member $member): bool
    {
        return $user->hasPermission(Permission::CardsIssue) && $member->isVisibleTo($user);
    }

    public function viewCard(User $user, Member $member): bool
    {
        if ($member->isOwnedBy($user)) {
            return $member->canAccessOwnCard();
        }

        return $user->hasPermission(Permission::CardsView) && $member->isVisibleTo($user);
    }
}
