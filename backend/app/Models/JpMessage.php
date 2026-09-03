<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JpMessage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'reference', 'member_id', 'user_id', 'guest_name', 'guest_email', 'source',
        'subject', 'category', 'body',
        'attachment_path', 'status', 'assigned_to', 'read_by_admin_at',
    ];

    protected function casts(): array
    {
        return [
            'read_by_admin_at' => 'datetime',
        ];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(JpMessageReply::class);
    }
}
