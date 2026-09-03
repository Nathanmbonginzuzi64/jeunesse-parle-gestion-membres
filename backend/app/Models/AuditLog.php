<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id', 'action', 'auditable_type', 'auditable_id', 'description',
        'old_values', 'new_values', 'ip_address', 'user_agent', 'portal', 'request_path',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /** Portail résolu (colonne ou heuristique UA pour les anciens enregistrements). */
    public function resolvedPortal(): string
    {
        if ($this->portal) {
            return $this->portal;
        }

        $ua = strtolower((string) $this->user_agent);

        if (
            str_contains($ua, 'jp-mobile')
            || str_contains($ua, 'jeunesse-parle-mobile')
            || str_contains($ua, 'expo')
            || str_contains($ua, 'okhttp')
            || str_contains($ua, 'reactnative')
            || str_contains($ua, 'react-native')
        ) {
            return 'mobile';
        }

        if (
            str_contains($ua, 'mozilla')
            || str_contains($ua, 'chrome')
            || str_contains($ua, 'safari')
            || str_contains($ua, 'firefox')
            || str_contains($ua, 'edg/')
        ) {
            return 'web';
        }

        return $this->user_id ? 'api' : 'system';
    }
}
