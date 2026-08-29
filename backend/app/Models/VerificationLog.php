<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VerificationLog extends Model
{
    protected $fillable = [
        'member_id', 'member_card_id', 'qr_token_id', 'token_fingerprint',
        'result', 'verified_by', 'context', 'ip_address', 'user_agent',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(MemberCard::class, 'member_card_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
