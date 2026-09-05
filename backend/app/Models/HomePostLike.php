<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomePostLike extends Model
{
    protected $fillable = [
        'home_post_id',
        'visitor_key',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(HomePost::class, 'home_post_id');
    }
}
