<?php

namespace App\Models;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activity extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code', 'title', 'description', 'type', 'starts_at', 'ends_at', 'location',
        'province_id', 'city_id', 'commune_id', 'structure_id',
        'organizer_id', 'status', 'capacity', 'is_public',
    ];

    protected function casts(): array
    {
        return [
            'type' => ActivityType::class,
            'status' => ActivityStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_public' => 'boolean',
            'capacity' => 'integer',
        ];
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function structure(): BelongsTo
    {
        return $this->belongsTo(Structure::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class)
            ->withPivot(['role', 'status', 'invited_at', 'confirmed_at'])
            ->withTimestamps();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /** Même cloisonnement que les membres : une activité appartient à un territoire. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return match ($user->scopeLevel()) {
            0 => $query,
            1 => $query->where('activities.province_id', $user->province_id ?? 0),
            2 => $query->where('activities.city_id', $user->city_id ?? 0),
            3 => $query->where('activities.structure_id', $user->structure_id ?? 0),
            default => $query->where(function (Builder $q) use ($user) {
                $q->where('activities.is_public', true)
                    ->orWhereHas('members', fn (Builder $m) => $m->where('members.id', $user->member_id ?? 0));
            }),
        };
    }

    public function isVisibleTo(User $user): bool
    {
        return match ($user->scopeLevel()) {
            0 => true,
            1 => $user->province_id !== null && $this->province_id === $user->province_id,
            2 => $user->city_id !== null && $this->city_id === $user->city_id,
            3 => $user->structure_id !== null && $this->structure_id === $user->structure_id,
            default => $this->is_public
                || ($user->member_id !== null && $this->members()->where('members.id', $user->member_id)->exists()),
        };
    }
}
