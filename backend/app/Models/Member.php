<?php

namespace App\Models;

use App\Enums\CardStatus;
use App\Enums\Gender;
use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\RecordsToTrash;

class Member extends Model
{
    use HasFactory, SoftDeletes, RecordsToTrash;

    protected $fillable = [
        'member_code', 'user_id', 'photo_path',
        'last_name', 'middle_name', 'first_name', 'gender', 'birth_date', 'birth_place',
        'phone', 'phone_alt', 'email', 'address', 'house_number',
        'province_id', 'city_id', 'commune_id', 'zone_id', 'avenue_id', 'structure_id',
        'education_level', 'profession', 'employment_status', 'activity_domain',
        'skills', 'interests',
        'position', 'supervisor_member_id', 'joined_at',
        'status', 'status_reason', 'status_changed_at', 'validated_at', 'validated_by',
        'registered_by', 'registration_channel', 'consent_given', 'consent_given_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'status' => MemberStatus::class,
            'gender' => Gender::class,
            'birth_date' => 'date',
            'joined_at' => 'date',
            'skills' => 'array',
            'interests' => 'array',
            'consent_given' => 'boolean',
            'consent_given_at' => 'datetime',
            'status_changed_at' => 'datetime',
            'validated_at' => 'datetime',
        ];
    }

    protected $appends = ['full_name', 'age'];

    // ---------------------------------------------------------------- Relations

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    public function structure(): BelongsTo
    {
        return $this->belongsTo(Structure::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'supervisor_member_id');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function registrar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function cards(): HasMany
    {
        return $this->hasMany(MemberCard::class)->orderByDesc('sequence');
    }

    public function activeCard(): HasOne
    {
        return $this->hasOne(MemberCard::class)->where('status', CardStatus::Active->value);
    }

    public function qrTokens(): HasMany
    {
        return $this->hasMany(QrToken::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(MemberStatusHistory::class)->latest();
    }

    public function activities(): BelongsToMany
    {
        return $this->belongsToMany(Activity::class)
            ->withPivot(['role', 'status', 'invited_at', 'confirmed_at'])
            ->withTimestamps();
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function verificationLogs(): HasMany
    {
        return $this->hasMany(VerificationLog::class)->latest();
    }

    public function biometricTemplates(): HasMany
    {
        return $this->hasMany(BiometricTemplate::class);
    }

    public function webAuthnCredentials(): HasMany
    {
        return $this->hasMany(WebAuthnCredential::class);
    }

    // ---------------------------------------------------------------- Accesseurs

    public function getFullNameAttribute(): string
    {
        return trim(implode(' ', array_filter([$this->last_name, $this->middle_name, $this->first_name])));
    }

    public function getAgeAttribute(): ?int
    {
        return $this->birth_date?->age;
    }

    // ---------------------------------------------------------------- Scopes

    /**
     * Cloisonnement territorial : la requête est réduite au périmètre du compte.
     * C'est la seule barrière qui compte — le frontend n'est jamais considéré comme fiable.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return match ($user->scopeLevel()) {
            0 => $query,
            1 => $query->where('members.province_id', $user->province_id ?? 0),
            2 => $query->where('members.city_id', $user->city_id ?? 0),
            3 => $query->where('members.structure_id', $user->structure_id ?? 0),
            default => $query->where('members.id', $user->member_id ?? 0),
        };
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', MemberStatus::Active->value);
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);

        if ($term === '') {
            return $query;
        }

        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $term).'%';

        return $query->where(function (Builder $q) use ($like) {
            $q->where('member_code', 'like', $like)
                ->orWhere('last_name', 'like', $like)
                ->orWhere('middle_name', 'like', $like)
                ->orWhere('first_name', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('email', 'like', $like);
        });
    }

    public function resolveRouteBinding($value, $field = null)
    {
        if ($field) {
            return $this->where($field, $value)->firstOrFail();
        }

        if (ctype_digit((string) $value)) {
            return $this->whereKey($value)->firstOrFail();
        }

        return $this->where('member_code', $value)->firstOrFail();
    }

    // ---------------------------------------------------------------- Helpers

    public function isVisibleTo(User $user): bool
    {
        return match ($user->scopeLevel()) {
            0 => true,
            1 => $user->province_id !== null && $this->province_id === $user->province_id,
            2 => $user->city_id !== null && $this->city_id === $user->city_id,
            3 => $user->structure_id !== null && $this->structure_id === $user->structure_id,
            default => $user->member_id !== null && $this->id === $user->member_id,
        };
    }

    public function isOwnedBy(User $user): bool
    {
        return $user->member_id === $this->id
            || ($user->hasRole(RoleSlug::Membre) && $this->user_id === $user->id);
    }

    /** Profil complémentaire requis avant consultation de la carte côté app membre. */
    public function hasCompletedProfile(): bool
    {
        return filled($this->phone_alt)
            && filled($this->city_id)
            && filled($this->commune_id)
            && filled($this->position)
            && filled($this->education_level)
            && filled($this->profession)
            && filled($this->employment_status)
            && filled($this->activity_domain)
            && is_array($this->skills) && count($this->skills) > 0
            && is_array($this->interests) && count($this->interests) > 0;
    }

    /** Le membre actif peut voir sa carte si le profil est complet ou si une carte a déjà été émise. */
    public function canAccessOwnCard(): bool
    {
        if ($this->status?->value !== 'active' || empty($this->structure_id)) {
            return false;
        }

        if ($this->hasCompletedProfile()) {
            return true;
        }

        return $this->relationLoaded('activeCard')
            ? $this->activeCard !== null
            : $this->activeCard()->exists();
    }

    /**
     * Profil complémentaire obligatoire seulement tant qu'aucune carte n'est disponible.
     * Les dossiers déjà équipés d'une carte restent accessibles dans l'app.
     */
    public function needsComplementaryProfile(): bool
    {
        if ($this->status?->value !== 'active' || empty($this->structure_id)) {
            return false;
        }

        if ($this->hasCompletedProfile()) {
            return false;
        }

        return $this->relationLoaded('activeCard')
            ? $this->activeCard === null
            : ! $this->activeCard()->exists();
    }
}
