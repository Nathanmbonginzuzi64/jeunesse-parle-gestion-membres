<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id', 'member_card_id', 'token', 'status',
        'expires_at', 'revoked_at', 'revoked_reason', 'last_scanned_at', 'scan_count',
    ];

    protected $hidden = ['token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'last_scanned_at' => 'datetime',
            'scan_count' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(MemberCard::class, 'member_card_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isUsable(): bool
    {
        return $this->status === 'active' && ! $this->isExpired();
    }
}
