<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomePostComment extends Model
{
    protected $fillable = [
        'home_post_id',
        'author_name',
        'author_email',
        'body',
        'is_approved',
        'visitor_key',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'is_approved' => 'boolean',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(HomePost::class, 'home_post_id');
    }
}
