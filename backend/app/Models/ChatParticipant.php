<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatParticipant extends Model
{
    protected $table = 'jp_chat_participants';

    protected $fillable = [
        'conversation_id', 'user_id', 'role', 'last_read_at', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'last_read_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
