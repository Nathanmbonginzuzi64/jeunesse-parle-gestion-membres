<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomePostShare extends Model
{
    protected $fillable = [
        'home_post_id',
        'visitor_key',
        'channel',
        'ip_address',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(HomePost::class, 'home_post_id');
    }
}
