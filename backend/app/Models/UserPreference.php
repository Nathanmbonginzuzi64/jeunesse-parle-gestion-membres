<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreference extends Model
{
    protected $fillable = [
        'user_id',
        'who_can_contact',
        'read_receipts',
        'show_online',
        'show_last_seen',
        'photo_visibility',
        'phone_visibility',
        'email_visibility',
        'theme',
        'locale',
        'reduce_motion',
        'auto_download_media',
        'wifi_only_downloads',
    ];

    protected function casts(): array
    {
        return [
            'read_receipts' => 'boolean',
            'show_online' => 'boolean',
            'show_last_seen' => 'boolean',
            'reduce_motion' => 'boolean',
            'auto_download_media' => 'boolean',
            'wifi_only_downloads' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function defaultsFor(User $user): self
    {
        return static::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'who_can_contact' => 'authorized',
                'read_receipts' => true,
                'show_online' => true,
                'show_last_seen' => true,
                'photo_visibility' => 'contacts',
                'phone_visibility' => 'private',
                'email_visibility' => 'private',
                'theme' => 'system',
                'locale' => 'fr',
                'reduce_motion' => false,
                'auto_download_media' => true,
                'wifi_only_downloads' => false,
            ],
        );
    }
}
