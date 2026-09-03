<?php

namespace App\Policies;

use App\Models\ChatConversation;
use App\Models\User;

class ChatConversationPolicy
{
    public function view(User $user, ChatConversation $conversation): bool
    {
        return $conversation->hasParticipant((int) $user->id);
    }

    public function send(User $user, ChatConversation $conversation): bool
    {
        return $this->view($user, $conversation);
    }
}
