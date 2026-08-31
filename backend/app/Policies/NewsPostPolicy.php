<?php

namespace App\Policies;

use App\Models\NewsPost;
use App\Models\User;

class NewsPostPolicy
{
    public function create(User $user): bool
    {
        return $user->hasPermission(\App\Enums\Permission::ActivitiesManage)
            || $user->hasPermission(\App\Enums\Permission::NotificationsSend);
    }
}
