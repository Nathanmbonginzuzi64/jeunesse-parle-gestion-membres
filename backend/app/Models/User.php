<?php

namespace App\Models;

use App\Enums\Permission as PermissionEnum;
use App\Enums\RoleSlug;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role_id',
        'province_id', 'city_id', 'commune_id', 'structure_id',
        'member_id', 'is_active', 'must_change_password',
    ];

    protected $hidden = [
        'password', 'remember_token', 'two_factor_secret',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
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

    public function notifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function hasRole(RoleSlug ...$slugs): bool
    {
        if (! $this->role) {
            return false;
        }

        return in_array($this->role->slug, array_column($slugs, 'value'), true);
    }

    /**
     * Le super administrateur court-circuite le catalogue de permissions ;
     * tous les autres rôles dépendent strictement de la table pivot.
     */
    public function hasPermission(PermissionEnum|string $permission): bool
    {
        if (! $this->is_active || ! $this->role) {
            return false;
        }

        if ($this->role->slug === RoleSlug::SuperAdmin->value) {
            return true;
        }

        $slug = $permission instanceof PermissionEnum ? $permission->value : $permission;

        return $this->permissionSlugs()->contains($slug);
    }

    public function permissionSlugs(): \Illuminate\Support\Collection
    {
        if (! $this->role) {
            return collect();
        }

        if ($this->role->slug === RoleSlug::SuperAdmin->value) {
            return collect(PermissionEnum::values());
        }

        return $this->role->relationLoaded('permissions')
            ? $this->role->permissions->pluck('slug')
            : $this->role->permissions()->pluck('slug');
    }

    public function scopeLevel(): int
    {
        return $this->role?->scope_level ?? 4;
    }

    public function biometricTemplates(): HasMany
    {
        return $this->hasMany(BiometricTemplate::class);
    }

    public function isNationalScope(): bool
    {
        return $this->scopeLevel() === 0;
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function registerSuccessfulLogin(?string $ip): void
    {
        $this->forceFill([
            'last_login_at' => Carbon::now(),
            'last_login_ip' => $ip,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();
    }

    /** Verrouille temporairement le compte après une série d'échecs. */
    public function registerFailedLogin(int $maxAttempts = 5, int $lockMinutes = 15): void
    {
        $attempts = $this->failed_login_attempts + 1;

        $this->forceFill([
            'failed_login_attempts' => $attempts,
            'locked_until' => $attempts >= $maxAttempts ? Carbon::now()->addMinutes($lockMinutes) : $this->locked_until,
        ])->save();
    }
}
