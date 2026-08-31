<?php

namespace App\Services;

use App\Enums\ActivityType;
use App\Enums\MemberStatus;
use App\Models\Activity;
use App\Models\Avenue;
use App\Models\City;
use App\Models\District;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\Province;
use App\Models\Structure;
use App\Models\User;
use App\Models\VerificationLog;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Agrégats de pilotage.
 *
 * Toutes les requêtes partent d'un builder déjà cloisonné par `visibleTo`,
 * si bien qu'un responsable ne peut jamais voir les chiffres d'un autre territoire.
 */
class StatisticsService
{
    public function overview(User $user, ?array $filters = null): array
    {
        $base = fn (): Builder => $this->filteredMembers($user, $filters);

        $byStatus = $base()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $total = (int) $byStatus->sum();

        return [
            'members' => [
                'total' => $total,
                'active' => (int) $byStatus->get(MemberStatus::Active->value, 0),
                'pending' => (int) $byStatus->get(MemberStatus::Pending->value, 0),
                'inactive' => (int) $byStatus->get(MemberStatus::Inactive->value, 0),
                'suspended' => (int) $byStatus->get(MemberStatus::Suspended->value, 0),
                'archived' => (int) $byStatus->get(MemberStatus::Archived->value, 0),
                'new_this_month' => (int) $base()->where('created_at', '>=', now()->startOfMonth())->count(),
                'new_last_30_days' => (int) $base()->where('created_at', '>=', now()->subDays(30))->count(),
            ],
            'coverage' => [
                'provinces' => $this->countTerritories(Province::query()->where('is_active', true), $user, 'province'),
                'cities' => $this->countTerritories(City::query()->where('is_active', true), $user, 'city'),
                'districts' => $this->countTerritories(District::query()->where('is_active', true), $user, 'district'),
                'quartiers' => $this->countTerritories(Zone::query()->where('is_active', true), $user, 'quartier'),
                'avenues' => $this->countTerritories(Avenue::query()->where('is_active', true), $user, 'avenue'),
                'structures' => (int) $this->structureQuery($user)->where('is_active', true)->count(),
            ],
            'cards' => [
                'active' => (int) $this->cardQuery($user)->where('member_cards.status', 'active')->count(),
                'issued_this_month' => (int) $this->cardQuery($user)->where('member_cards.created_at', '>=', now()->startOfMonth())->count(),
            ],
            'activities' => [
                'total' => (int) Activity::query()->visibleTo($user)->count(),
                'upcoming' => (int) Activity::query()->visibleTo($user)->where('starts_at', '>=', now())->whereIn('status', ['planned', 'ongoing'])->count(),
            ],
            'verifications' => [
                'last_30_days' => (int) $this->verificationQuery($user)->where('verification_logs.created_at', '>=', now()->subDays(30))->count(),
            ],
        ];
    }

    /** Agrégats nationaux affichés sur la page d'accueil publique (sans donnée personnelle). */
    public function publicLandingStats(): array
    {
        return [
            'members_total' => (int) Member::query()->count(),
            'provinces_covered' => (int) Member::query()
                ->whereNotNull('province_id')
                ->distinct()
                ->count('province_id'),
            'structures_active' => (int) Structure::query()->where('is_active', true)->count(),
            'cards_verified' => (int) MemberCard::query()->where('status', 'active')->count(),
            'updated_at' => now()->toIso8601String(),
        ];
    }

    /** Série d'inscriptions mensuelles, utilisée par le graphique d'évolution. */
    public function registrationsTrend(User $user, int $months = 12, ?array $filters = null): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);

        $rows = $this->filteredMembers($user, $filters)
            ->where('created_at', '>=', $start)
            ->select(DB::raw($this->monthExpression('created_at').' as period'), DB::raw('COUNT(*) as total'))
            ->groupBy('period')
            ->pluck('total', 'period');

        $series = [];

        for ($i = 0; $i < $months; $i++) {
            $date = $start->copy()->addMonths($i);
            $key = $date->format('Y-m');

            $series[] = [
                'period' => $key,
                'label' => $date->translatedFormat('M Y'),
                'total' => (int) $rows->get($key, 0),
            ];
        }

        return $series;
    }

    public function byProvince(User $user, ?array $filters = null): array
    {
        return $this->filteredMembers($user, $filters)
            ->join('provinces', 'provinces.id', '=', 'members.province_id')
            ->select(
                'provinces.id',
                'provinces.name',
                'provinces.code',
                'provinces.latitude',
                'provinces.longitude',
                DB::raw('COUNT(members.id) as total'),
                DB::raw("SUM(CASE WHEN members.status = 'active' THEN 1 ELSE 0 END) as active"),
            )
            ->groupBy('provinces.id', 'provinces.name', 'provinces.code', 'provinces.latitude', 'provinces.longitude')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'code' => $row->code,
                'latitude' => $row->latitude !== null ? (float) $row->latitude : null,
                'longitude' => $row->longitude !== null ? (float) $row->longitude : null,
                'total' => (int) $row->total,
                'active' => (int) $row->active,
            ])
            ->all();
    }

    public function byCity(User $user, ?int $provinceId = null, ?array $filters = null): array
    {
        return $this->filteredMembers($user, $filters)
            ->join('cities', 'cities.id', '=', 'members.city_id')
            ->when($provinceId, fn (Builder $q) => $q->where('members.province_id', $provinceId))
            ->select('cities.id', 'cities.name', 'cities.type', DB::raw('COUNT(members.id) as total'))
            ->groupBy('cities.id', 'cities.name', 'cities.type')
            ->orderByDesc('total')
            ->limit(50)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'type' => $row->type,
                'total' => (int) $row->total,
            ])
            ->all();
    }

    public function byCommune(User $user, ?int $cityId = null, ?array $filters = null): array
    {
        return $this->filteredMembers($user, $filters)
            ->join('communes', 'communes.id', '=', 'members.commune_id')
            ->when($cityId, fn (Builder $q) => $q->where('members.city_id', $cityId))
            ->select('communes.id', 'communes.name', DB::raw('COUNT(members.id) as total'))
            ->groupBy('communes.id', 'communes.name')
            ->orderByDesc('total')
            ->limit(50)
            ->get()
            ->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name, 'total' => (int) $row->total])
            ->all();
    }

    public function byGender(User $user, ?array $filters = null): array
    {
        return $this->filteredMembers($user, $filters)
            ->select('gender', DB::raw('COUNT(*) as total'))
            ->groupBy('gender')
            ->get()
            ->map(fn ($row) => [
                'key' => $row->gender?->value ?? 'N/A',
                'label' => $row->gender?->label() ?? 'Non renseigné',
                'total' => (int) $row->total,
            ])
            ->all();
    }

    public function byStatus(User $user, ?array $filters = null): array
    {
        $rows = $this->filteredMembers($user, $filters)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        return collect(MemberStatus::cases())
            ->map(fn (MemberStatus $status) => [
                'key' => $status->value,
                'label' => $status->label(),
                'total' => (int) $rows->get($status->value, 0),
            ])
            ->all();
    }

    public function byProfession(User $user, int $limit = 10, ?array $filters = null): array
    {
        return $this->filteredMembers($user, $filters)
            ->whereNotNull('profession')
            ->where('profession', '!=', '')
            ->select('profession', DB::raw('COUNT(*) as total'))
            ->groupBy('profession')
            ->orderByDesc('total')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => ['label' => $row->profession, 'total' => (int) $row->total])
            ->all();
    }

    /** Tranches d'âge calculées en PHP pour rester portable entre SQLite et MySQL. */
    public function byAgeRange(User $user, ?array $filters = null): array
    {
        $buckets = [
            '15-17' => [15, 17],
            '18-24' => [18, 24],
            '25-34' => [25, 34],
            '35-44' => [35, 44],
            '45+' => [45, 200],
        ];

        $result = [];

        foreach ($buckets as $label => [$min, $max]) {
            $result[] = [
                'label' => $label,
                'total' => (int) $this->filteredMembers($user, $filters)
                    ->whereNotNull('birth_date')
                    ->whereDate('birth_date', '<=', now()->subYears($min)->toDateString())
                    ->whereDate('birth_date', '>', now()->subYears($max + 1)->toDateString())
                    ->count(),
            ];
        }

        return $result;
    }

    public function topSkills(User $user, int $limit = 12, ?array $filters = null): array
    {
        // Les compétences sont stockées en JSON : agrégation applicative sur un
        // sous-ensemble borné pour rester compatible SQLite/MySQL.
        $counts = [];

        $this->filteredMembers($user, $filters)
            ->whereNotNull('skills')
            ->select('skills')
            ->limit(20000)
            ->cursor()
            ->each(function (Member $member) use (&$counts) {
                foreach ((array) $member->skills as $skill) {
                    $key = mb_strtolower(trim((string) $skill));
                    if ($key === '') {
                        continue;
                    }
                    $counts[$key] = ($counts[$key] ?? 0) + 1;
                }
            });

        arsort($counts);

        return collect($counts)
            ->take($limit)
            ->map(fn (int $total, string $label) => ['label' => ucfirst($label), 'total' => $total])
            ->values()
            ->all();
    }

    public function recentActivity(User $user, int $limit = 8): array
    {
        $members = Member::query()
            ->visibleTo($user)
            ->latest()
            ->limit($limit)
            ->get(['id', 'member_code', 'last_name', 'middle_name', 'first_name', 'status', 'created_at'])
            ->map(fn (Member $m) => [
                'type' => 'member_registered',
                'label' => "Nouveau membre : {$m->full_name}",
                'reference' => $m->member_code,
                'status' => $m->status->label(),
                'at' => $m->created_at?->toIso8601String(),
            ]);

        $cards = $this->cardQuery($user)
            ->join('members', 'members.id', '=', 'member_cards.member_id')
            ->latest('member_cards.created_at')
            ->limit($limit)
            ->get(['member_cards.card_number', 'member_cards.created_at', 'members.last_name', 'members.first_name'])
            ->map(fn ($row) => [
                'type' => 'card_issued',
                'label' => "Carte générée : {$row->last_name} {$row->first_name}",
                'reference' => $row->card_number,
                'status' => null,
                'at' => $row->created_at?->toIso8601String(),
            ]);

        return collect($members)
            ->merge($cards)
            ->sortByDesc('at')
            ->take($limit)
            ->values()
            ->all();
    }

    /** Données agrégées pour la cartographie — jamais de position individuelle. */
    public function mapStatistics(User $user): array
    {
        $provinces = $this->byProvince($user);

        return [
            'total' => array_sum(array_column($provinces, 'total')),
            'provinces' => $provinces,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function byActivity(User $user, ?array $filters = null): array
    {
        return Activity::query()
            ->visibleTo($user)
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('province_id', $v))
            ->when($filters['city_id'] ?? null, fn (Builder $q, $v) => $q->where('city_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('structure_id', $v))
            ->select('type', DB::raw('COUNT(*) as total'))
            ->groupBy('type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'key' => ActivityType::resolve($row->type)->value,
                'label' => ActivityType::resolve($row->type)->label(),
                'total' => (int) $row->total,
            ])
            ->all();
    }

    // ------------------------------------------------------------ Sous-requêtes cloisonnées

    private function filteredMembers(User $user, ?array $filters = null): Builder
    {
        $query = Member::query()->visibleTo($user);

        if (! $filters) {
            return $query;
        }

        $query
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('members.status', $v))
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('members.province_id', $v))
            ->when($filters['city_id'] ?? null, fn (Builder $q, $v) => $q->where('members.city_id', $v))
            ->when($filters['commune_id'] ?? null, fn (Builder $q, $v) => $q->where('members.commune_id', $v))
            ->when($filters['zone_id'] ?? null, fn (Builder $q, $v) => $q->where('members.zone_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('members.structure_id', $v));

        if (! empty($filters['period'])) {
            $from = match ($filters['period']) {
                '7d' => now()->subDays(7),
                '30d' => now()->subDays(30),
                '90d' => now()->subDays(90),
                '12m' => now()->subMonths(12),
                default => null,
            };

            if ($from) {
                $query->where('members.created_at', '>=', $from);
            }
        }

        return $query;
    }

    private function structureQuery(User $user): Builder
    {
        return match ($user->scopeLevel()) {
            0 => Structure::query(),
            1 => Structure::query()->where('province_id', $user->province_id ?? 0),
            2 => Structure::query()->where('city_id', $user->city_id ?? 0),
            default => Structure::query()->where('id', $user->structure_id ?? 0),
        };
    }

    /** Compte les entités du référentiel territorial selon le périmètre de l'utilisateur. */
    private function countTerritories(Builder $query, User $user, string $level): int
    {
        if ($user->isNationalScope()) {
            return (int) $query->count();
        }

        return (int) match ($user->scopeLevel()) {
            1 => match ($level) {
                'province' => $query->where('id', $user->province_id ?? 0)->count(),
                default => $query->where('province_id', $user->province_id ?? 0)->count(),
            },
            2 => match ($level) {
                'province' => $query->where('id', $user->province_id ?? 0)->count(),
                'city' => $query->where('id', $user->city_id ?? 0)->count(),
                default => $query->where('city_id', $user->city_id ?? 0)->count(),
            },
            default => match ($level) {
                'province' => $query->where('id', $user->province_id ?? 0)->count(),
                'city' => $query->where('id', $user->city_id ?? 0)->count(),
                default => $query->where('province_id', $user->province_id ?? 0)
                    ->when($user->city_id, fn (Builder $q) => $q->where('city_id', $user->city_id))
                    ->count(),
            },
        };
    }

    private function cardQuery(User $user): Builder
    {
        return MemberCard::query()->whereIn(
            'member_cards.member_id',
            Member::query()->visibleTo($user)->select('members.id'),
        );
    }

    private function verificationQuery(User $user): Builder
    {
        return VerificationLog::query()->whereIn(
            'verification_logs.member_id',
            Member::query()->visibleTo($user)->select('members.id'),
        );
    }

    private function monthExpression(string $column): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', {$column})"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }
}
