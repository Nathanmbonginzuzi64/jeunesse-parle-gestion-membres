<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'name', 'chief_town', 'latitude', 'longitude', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function cities(): HasMany
    {
        return $this->hasMany(City::class);
    }

    public function communes(): HasMany
    {
        return $this->hasMany(Commune::class);
    }

    public function structures(): HasMany
    {
        return $this->hasMany(Structure::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(Member::class);
    }
}
