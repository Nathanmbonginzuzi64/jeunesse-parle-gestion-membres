<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemBackup extends Model
{
    protected $fillable = [
        'code',
        'filename',
        'disk_path',
        'format',
        'size_bytes',
        'checksum',
        'status',
        'tables_count',
        'rows_count',
        'notes',
        'meta',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'size_bytes' => 'integer',
            'tables_count' => 'integer',
            'rows_count' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
