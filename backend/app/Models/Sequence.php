<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Sequence extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Incrémente le compteur et renvoie la nouvelle valeur.
     * Doit être appelé dans une transaction pour garantir l'unicité.
     */
    public static function next(string $key): int
    {
        return DB::transaction(function () use ($key) {
            $sequence = static::query()->where('key', $key)->lockForUpdate()->first();

            if (! $sequence) {
                $sequence = static::query()->create(['key' => $key, 'value' => 0]);
            }

            $sequence->increment('value');

            return (int) $sequence->refresh()->value;
        });
    }
}
