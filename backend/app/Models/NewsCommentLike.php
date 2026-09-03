<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsCommentLike extends Model
{
    protected $fillable = ['news_comment_id', 'user_id'];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(NewsComment::class, 'news_comment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
