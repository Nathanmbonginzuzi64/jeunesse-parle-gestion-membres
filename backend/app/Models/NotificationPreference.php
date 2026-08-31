<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'activity',
        'news',
        'message',
        'presence',
        'security',
        'promotion',
        'reminder',
        'push_enabled',
        'email_enabled',
    ];

    protected function casts(): array
    {
        return [
            'activity' => 'boolean',
            'news' => 'boolean',
            'message' => 'boolean',
            'presence' => 'boolean',
            'security' => 'boolean',
            'promotion' => 'boolean',
            'reminder' => 'boolean',
            'push_enabled' => 'boolean',
            'email_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function defaultsFor(User $user): self
    {
        return self::firstOrCreate(['user_id' => $user->id]);
    }
}
