<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsView extends Model
{
    protected $fillable = ['news_post_id', 'user_id', 'member_id', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(NewsPost::class, 'news_post_id');
    }
}
