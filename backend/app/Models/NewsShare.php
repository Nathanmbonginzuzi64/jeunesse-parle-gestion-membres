<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsShare extends Model
{
    protected $fillable = ['news_post_id', 'member_id', 'user_id', 'channel'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(NewsPost::class, 'news_post_id');
    }
}
