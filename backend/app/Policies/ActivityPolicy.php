<?php

namespace App\Policies;

use App\Enums\Permission;
use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission(Permission::ActivitiesView);
    }

    public function view(User $user, Activity $activity): bool
    {
        return $user->hasPermission(Permission::ActivitiesView) && $activity->isVisibleTo($user);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::ActivitiesManage);
    }

    public function update(User $user, Activity $activity): bool
    {
        return $user->hasPermission(Permission::ActivitiesManage) && $activity->isVisibleTo($user);
    }

    public function delete(User $user, Activity $activity): bool
    {
        return $user->hasPermission(Permission::ActivitiesManage) && $activity->isVisibleTo($user);
    }

    public function recordAttendance(User $user, Activity $activity): bool
    {
        return $user->hasPermission(Permission::AttendanceRecord) && $activity->isVisibleTo($user);
    }

    public function viewAttendance(User $user, Activity $activity): bool
    {
        return $user->hasPermission(Permission::AttendanceView) && $activity->isVisibleTo($user);
    }
}
