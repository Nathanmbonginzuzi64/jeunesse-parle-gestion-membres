<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\RecordsToTrash;

class NewsComment extends Model
{
    use SoftDeletes, RecordsToTrash;

    protected $fillable = ['news_post_id', 'member_id', 'user_id', 'parent_id', 'body', 'likes_count'];

    protected function casts(): array
    {
        return [
            'likes_count' => 'integer',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(NewsPost::class, 'news_post_id');
    }

    public function newsPost(): BelongsTo
    {
        return $this->belongsTo(NewsPost::class, 'news_post_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(NewsCommentLike::class, 'news_comment_id');
    }
}
