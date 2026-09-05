<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class TrashItem extends Model
{
    protected $fillable = [
        'subject_type',
        'subject_id',
        'module',
        'label',
        'payload',
        'deleted_by',
        'deleted_by_name',
        'restored_at',
        'restored_by',
        'purged_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'restored_at' => 'datetime',
            'purged_at' => 'datetime',
        ];
    }

    public function subject(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_id');
    }

    public function deleter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function restorer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'restored_by');
    }

    public function scopeActive($query)
    {
        return $query->whereNull('restored_at')->whereNull('purged_at');
    }
}
