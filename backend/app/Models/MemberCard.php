<?php

namespace App\Models;

use App\Enums\CardStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MemberCard extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id', 'card_number', 'sequence', 'status', 'status_reason',
        'issued_at', 'expires_at', 'revoked_at', 'replaced_by_card_id',
        'issued_by', 'template_version',
    ];

    protected function casts(): array
    {
        return [
            'status' => CardStatus::class,
            'issued_at' => 'date',
            'expires_at' => 'date',
            'revoked_at' => 'datetime',
            'sequence' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function replacedBy(): BelongsTo
    {
        return $this->belongsTo(MemberCard::class, 'replaced_by_card_id');
    }

    public function qrTokens(): HasMany
    {
        return $this->hasMany(QrToken::class);
    }

    public function activeQrToken(): HasOne
    {
        return $this->hasOne(QrToken::class)->where('status', 'active');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /** Une carte n'est exploitable que si elle est active, non expirée et adossée à un membre actif. */
    public function isValid(): bool
    {
        return $this->status === CardStatus::Active
            && ! $this->isExpired()
            && $this->member?->status->allowsCard() === true;
    }
}
