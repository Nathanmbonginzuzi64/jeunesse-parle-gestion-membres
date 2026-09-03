<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ChatConversation extends Model
{
    protected $table = 'jp_chat_conversations';

    protected $fillable = [
        'type', 'pair_key', 'subject', 'created_by',
        'structure_id', 'activity_id',
        'last_message_at', 'last_message_preview',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class, 'conversation_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(ChatMessage::class, 'conversation_id')->latestOfMany();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function hasParticipant(int $userId): bool
    {
        if ($this->relationLoaded('participants')) {
            return $this->participants->contains('user_id', $userId);
        }

        return $this->participants()->where('user_id', $userId)->exists();
    }

    public function otherParticipant(User $user): ?User
    {
        $row = $this->relationLoaded('participants')
            ? $this->participants->firstWhere('user_id', '!=', $user->id)
            : $this->participants()->with('user')->where('user_id', '!=', $user->id)->first();

        $row?->loadMissing('user');

        return $row?->user;
    }
}
