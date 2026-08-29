<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Référence vers un gabarit biométrique conservé hors application.
 * Aucune donnée biométrique brute ne transite ni ne réside ici.
 */
class BiometricTemplate extends Model
{
    protected $fillable = [
        'member_id', 'modality', 'position', 'provider', 'algorithm',
        'template_reference', 'quality_score', 'status',
        'captured_at', 'consent_given_at', 'consent_reference', 'enrolled_by',
    ];

    protected $hidden = ['template_reference'];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'consent_given_at' => 'datetime',
            'quality_score' => 'integer',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }
}
