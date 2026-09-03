<?php

namespace App\Policies;

use App\Enums\RoleSlug;
use App\Models\ChatConversation;
use App\Models\User;

class ChatConversationPolicy
{
    public function view(User $user, ChatConversation $conversation): bool
    {
        if ($user->hasRole(RoleSlug::SuperAdmin)) {
            return true;
        }

        return $conversation->hasParticipant((int) $user->id);
    }

    public function send(User $user, ChatConversation $conversation): bool
    {
        return $conversation->hasParticipant((int) $user->id);
    }

    /** Liste / supervision centrale de toutes les conversations. */
    public function oversee(User $user): bool
    {
        return $user->hasRole(RoleSlug::SuperAdmin);
    }
}
