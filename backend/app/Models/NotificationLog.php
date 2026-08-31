<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationLog extends Model
{
    protected $fillable = [
        'notification_id',
        'user_id',
        'type',
        'channel',
        'status',
        'recipient_label',
        'author_id',
        'sent_at',
        'received_at',
        'error',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'received_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function notification(): BelongsTo
    {
        return $this->belongsTo(AppNotification::class, 'notification_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
