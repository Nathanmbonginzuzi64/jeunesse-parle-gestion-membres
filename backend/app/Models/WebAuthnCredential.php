<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebAuthnCredential extends Model
{
    protected $table = 'webauthn_credentials';

    protected $fillable = [
        'user_id',
        'member_id',
        'credential_id',
        'public_key',
        'counter',
        'aaguid',
        'transports',
        'device_name',
        'attestation_format',
        'last_used_at',
    ];

    protected $hidden = [
        'public_key',
    ];

    protected function casts(): array
    {
        return [
            'transports' => 'array',
            'counter' => 'integer',
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
