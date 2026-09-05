<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomePostView extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'home_post_id',
        'visitor_key',
        'ip_address',
        'viewed_on',
        'viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'viewed_on' => 'date',
            'viewed_at' => 'datetime',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(HomePost::class, 'home_post_id');
    }
}
