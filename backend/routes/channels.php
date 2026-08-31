<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function ($user, int $id) {
    return (int) $user->id === $id;
});
