<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'group', 'label', 'is_public'];

    protected function casts(): array
    {
        return ['is_public' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('settings.all'));
        static::deleted(fn () => Cache::forget('settings.all'));
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = Cache::remember('settings.all', 3600, fn () => static::all()->keyBy('key'));

        $setting = $all->get($key);

        return $setting ? $setting->typedValue() : $default;
    }

    public static function put(string $key, mixed $value, string $type = 'string', ?string $group = null, ?string $label = null): self
    {
        $stored = match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOL) ? '1' : '0',
            'integer' => (string) (int) $value,
            'json' => json_encode($value, JSON_UNESCAPED_UNICODE),
            default => (string) $value,
        };

        $setting = static::query()->firstOrNew(['key' => $key]);
        $setting->value = $stored;
        $setting->type = $type;
        $setting->group = $group ?? $setting->group ?? 'general';
        $setting->label = $label ?? $setting->label ?? $key;
        $setting->save();

        return $setting;
    }

    public function typedValue(): mixed
    {
        return match ($this->type) {
            'integer' => (int) $this->value,
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOL),
            'json' => json_decode((string) $this->value, true),
            default => $this->value,
        };
    }
}
