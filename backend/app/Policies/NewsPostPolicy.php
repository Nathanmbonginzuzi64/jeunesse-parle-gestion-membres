<?php

namespace App\Policies;

use App\Models\NewsPost;
use App\Models\User;
use App\Enums\Permission;

class NewsPostPolicy
{
    public function create(User $user): bool
    {
        return $user->hasPermission(Permission::ActivitiesManage)
            || $user->hasPermission(Permission::NotificationsSend);
    }

    public function update(User $user, NewsPost $post): bool
    {
        return $this->create($user) || $post->author_id === $user->id;
    }

    public function delete(User $user, NewsPost $post): bool
    {
        return $user->hasPermission(Permission::ActivitiesManage);
    }

    public function manage(User $user): bool
    {
        return $this->create($user);
    }
}
