<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\RecordsToTrash;

class Structure extends Model
{
    use HasFactory, SoftDeletes, RecordsToTrash;

    protected $fillable = [
        'code', 'name', 'type', 'description',
        'province_id', 'city_id', 'commune_id', 'zone_id', 'avenue_id',
        'address', 'contact_phone', 'contact_email',
        'leader_member_id', 'created_on', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'created_on' => 'date',
            'is_active' => 'boolean',
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

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function avenue(): BelongsTo
    {
        return $this->belongsTo(Avenue::class);
    }

    public function leader(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'leader_member_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
