<?php

namespace App\Services;

use App\Enums\MemberStatus;
use App\Models\Activity;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\Province;
use App\Models\Structure;
use App\Models\User;
use App\Models\VerificationLog;
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
    public function overview(User $user): array
    {
        $base = fn (): Builder => Member::query()->visibleTo($user);

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
                'provinces' => (int) $base()->distinct()->count('province_id'),
                'cities' => (int) $base()->whereNotNull('city_id')->distinct()->count('city_id'),
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

    /** Série d'inscriptions mensuelles, utilisée par le graphique d'évolution. */
    public function registrationsTrend(User $user, int $months = 12): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);

        $rows = Member::query()
            ->visibleTo($user)
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

    public function byProvince(User $user): array
    {
        return Member::query()
            ->visibleTo($user)
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

    public function byCity(User $user, ?int $provinceId = null): array
    {
        return Member::query()
            ->visibleTo($user)
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

    public function byCommune(User $user, ?int $cityId = null): array
    {
        return Member::query()
            ->visibleTo($user)
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

    public function byGender(User $user): array
    {
        return Member::query()
            ->visibleTo($user)
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

    public function byStatus(User $user): array
    {
        $rows = Member::query()
            ->visibleTo($user)
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

    public function byProfession(User $user, int $limit = 10): array
    {
        return Member::query()
            ->visibleTo($user)
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
    public function byAgeRange(User $user): array
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
                'total' => (int) Member::query()
                    ->visibleTo($user)
                    ->whereNotNull('birth_date')
                    ->whereDate('birth_date', '<=', now()->subYears($min)->toDateString())
                    ->whereDate('birth_date', '>', now()->subYears($max + 1)->toDateString())
                    ->count(),
            ];
        }

        return $result;
    }

    public function topSkills(User $user, int $limit = 12): array
    {
        // Les compétences sont stockées en JSON : agrégation applicative sur un
        // sous-ensemble borné pour rester compatible SQLite/MySQL.
        $counts = [];

        Member::query()
            ->visibleTo($user)
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

    // ------------------------------------------------------------ Sous-requêtes cloisonnées

    private function structureQuery(User $user): Builder
    {
        return match ($user->scopeLevel()) {
            0 => Structure::query(),
            1 => Structure::query()->where('province_id', $user->province_id ?? 0),
            2 => Structure::query()->where('city_id', $user->city_id ?? 0),
            default => Structure::query()->where('id', $user->structure_id ?? 0),
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
