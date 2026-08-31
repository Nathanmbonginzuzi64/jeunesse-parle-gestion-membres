<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class NewsPost extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title', 'body', 'category', 'media_type', 'media_path', 'gallery_paths', 'external_url',
        'activity_id', 'author_id', 'is_published',
        'views_count', 'likes_count', 'comments_count', 'shares_count',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'gallery_paths' => 'array',
            'views_count' => 'integer',
            'likes_count' => 'integer',
            'comments_count' => 'integer',
            'shares_count' => 'integer',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(NewsReaction::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(NewsComment::class);
    }

    public function views(): HasMany
    {
        return $this->hasMany(NewsView::class);
    }

    public function shares(): HasMany
    {
        return $this->hasMany(NewsShare::class);
    }
}
