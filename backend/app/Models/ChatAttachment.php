<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatAttachment extends Model
{
    protected $table = 'jp_chat_attachments';

    protected $fillable = [
        'message_id', 'path', 'original_name', 'mime', 'size', 'kind',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    public function url(): string
    {
        return route('media.chat-attachment', ['attachment' => $this->id]);
    }
}
