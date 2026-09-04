<?php

namespace App\Services;

use App\Enums\ActivityType;
use App\Enums\AttendanceStatus;
use App\Enums\CardStatus;
use App\Enums\MemberStatus;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Agrégation des rapports institutionnels — toujours cloisonné par `visibleTo`.
 */
class ReportService
{
    public function hub(User $user): array
    {
        return [
            'scope' => [
                'level' => $user->scopeLevel(),
                'role' => $user->role?->name,
                'province' => $user->province?->name,
                'city' => $user->city?->name,
                'structure' => $user->structure?->name,
            ],
            'reports' => [
                ['id' => 'members', 'label' => 'Membres par localisation', 'endpoint' => '/reports/members'],
                ['id' => 'member-profile', 'label' => 'Profil complet membre', 'endpoint' => '/reports/members/{member}'],
                ['id' => 'activities', 'label' => 'Activités', 'endpoint' => '/reports/activities'],
                ['id' => 'cards', 'label' => 'Cartes membres', 'endpoint' => '/reports/cards'],
                ['id' => 'attendance', 'label' => 'Présences', 'endpoint' => '/reports/attendance'],
                ['id' => 'users', 'label' => 'Utilisateurs système', 'endpoint' => '/reports/users'],
                ['id' => 'roles', 'label' => 'Rôles & permissions', 'endpoint' => '/reports/roles'],
                ['id' => 'audit', 'label' => 'Journal d\'audit', 'endpoint' => '/audit'],
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function validateFilters(array $input): array
    {
        return validator($input, [
            'q' => ['nullable', 'string', 'max:120'],
            'period' => ['nullable', Rule::in(['7d', '30d', '90d', '12m'])],
            'status' => ['nullable', Rule::in(MemberStatus::values())],
            'province_id' => ['nullable', 'integer'],
            'city_id' => ['nullable', 'integer'],
            'commune_id' => ['nullable', 'integer'],
            'zone_id' => ['nullable', 'integer'],
            'structure_id' => ['nullable', 'integer'],
            'registered_from' => ['nullable', 'date'],
            'registered_to' => ['nullable', 'date'],
            'activity_type' => ['nullable', Rule::in(ActivityType::values())],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();
    }

    public function membersQuery(User $user, array $filters): Builder
    {
        $query = Member::query()
            ->visibleTo($user)
            ->with([
                'province:id,name',
                'city:id,name',
                'commune:id,name,district_id',
                'commune.district:id,name',
                'zone:id,name',
                'structure:id,name,avenue_id',
                'structure.avenue:id,name',
                'activeCard:id,member_id,card_number,status,issued_at,expires_at',
                'supervisor:id,member_code,last_name,first_name',
            ])
            ->withExists([
                'webAuthnCredentials as has_webauthn',
                'biometricTemplates as has_fingerprint' => fn (Builder $q) => $q
                    ->where('modality', 'fingerprint')
                    ->where('status', 'enrolled'),
            ])
            ->search($filters['q'] ?? null);

        $this->applyMemberFilters($query, $filters);

        return $query->orderByDesc('members.created_at');
    }

    public function formatMemberRow(Member $member, bool $includeContact = false): array
    {
        $biometric = ($member->has_webauthn ?? false)
            || ($member->has_fingerprint ?? false)
            || $member->webAuthnCredentials()->exists()
            || $member->biometricTemplates()
                ->where('modality', 'fingerprint')
                ->where('status', 'enrolled')
                ->exists();

        $row = [
            'id' => $member->id,
            'member_code' => $member->member_code,
            'photo_url' => $member->photo_path ? route('media.member-photo', ['member' => $member->member_code]) : null,
            'last_name' => $member->last_name,
            'middle_name' => $member->middle_name,
            'first_name' => $member->first_name,
            'full_name' => $member->full_name,
            'gender' => $member->gender?->value,
            'gender_label' => $member->gender?->label(),
            'birth_date' => $member->birth_date?->toDateString(),
            'province' => $member->province?->name,
            'city' => $member->city?->name,
            'district' => $member->commune?->district?->name,
            'commune' => $member->commune?->name,
            'quartier' => $member->zone?->name,
            'avenue' => $member->structure?->avenue?->name,
            'structure' => $member->structure?->name,
            'joined_at' => $member->joined_at?->toDateString(),
            'created_at' => $member->created_at?->toIso8601String(),
            'status' => $member->status->value,
            'status_label' => $member->status->label(),
            'card_status' => $member->activeCard?->status->value,
            'card_status_label' => $member->activeCard?->status->label(),
            'card_number' => $member->activeCard?->card_number,
            'biometric_enrolled' => $biometric,
            'supervisor' => $member->supervisor ? [
                'member_code' => $member->supervisor->member_code,
                'full_name' => $member->supervisor->full_name,
            ] : null,
        ];

        if ($includeContact) {
            $row['phone'] = $member->phone;
            $row['email'] = $member->email;
        }

        return $row;
    }

    public function memberProfile(User $user, Member $member): array
    {
        abort_unless($member->isVisibleTo($user), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        $member->load([
            'province', 'city', 'commune.district', 'zone',
            'structure.avenue', 'supervisor', 'activeCard',
        ]);

        $activities = $member->activities()
            ->with(['province:id,name', 'city:id,name'])
            ->orderByDesc('starts_at')
            ->limit(100)
            ->get()
            ->map(fn (Activity $a) => [
                'id' => $a->id,
                'code' => $a->code,
                'title' => $a->title,
                'type' => $a->type->value,
                'type_label' => $a->type->label(),
                'starts_at' => $a->starts_at?->toIso8601String(),
                'location' => $a->location,
                'role' => $a->pivot->role ?? null,
            ]);

        $attendances = $member->attendances()
            ->with('activity:id,title,type,starts_at,location')
            ->orderByDesc('recorded_at')
            ->limit(200)
            ->get()
            ->map(fn (Attendance $a) => [
                'id' => $a->id,
                'activity' => $a->activity?->title,
                'activity_type' => $a->activity?->type?->label(),
                'date' => $a->activity?->starts_at?->toDateString(),
                'location' => $a->activity?->location,
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
                'method' => $a->method,
                'recorded_at' => $a->recorded_at?->toIso8601String(),
            ]);

        $present = $attendances->where('status', AttendanceStatus::Present->value)->count();
        $total = $attendances->count();

        return [
            'member' => $this->formatMemberRow($member, $user->can('viewSensitive', $member)),
            'profile' => [
                'education_level' => $member->education_level,
                'profession' => $member->profession,
                'employment_status' => $member->employment_status,
                'activity_domain' => $member->activity_domain,
                'skills' => $member->skills ?? [],
                'interests' => $member->interests ?? [],
                'address' => $user->can('viewSensitive', $member) ? $member->address : null,
            ],
            'activities' => $activities->values()->all(),
            'attendances' => $attendances->values()->all(),
            'summary' => [
                'activities_count' => $activities->count(),
                'attendances_present' => $present,
                'attendances_total' => $total,
                'participation_rate' => $total > 0 ? round(($present / $total) * 100) : null,
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function activities(User $user, array $filters): array
    {
        $query = Activity::query()
            ->visibleTo($user)
            ->with(['province:id,name', 'city:id,name', 'commune:id,name', 'structure:id,name', 'organizer:id,name'])
            ->withCount(['members', 'attendances'])
            ->when($filters['activity_type'] ?? null, fn (Builder $q, $v) => $q->where('type', $v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->whereDate('starts_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->whereDate('starts_at', '<=', $v))
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('province_id', $v))
            ->when($filters['city_id'] ?? null, fn (Builder $q, $v) => $q->where('city_id', $v))
            ->when($filters['commune_id'] ?? null, fn (Builder $q, $v) => $q->where('commune_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('structure_id', $v))
            ->when($filters['q'] ?? null, fn (Builder $q, $v) => $q->where(function (Builder $inner) use ($v) {
                $inner->where('title', 'like', '%'.$v.'%')
                    ->orWhere('code', 'like', '%'.$v.'%');
            }))
            ->orderByDesc('starts_at');

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        $paginated = $query->paginate($perPage)->withQueryString();

        return [
            'data' => $paginated->getCollection()->map(fn (Activity $a) => [
                'id' => $a->id,
                'code' => $a->code,
                'title' => $a->title,
                'type' => $a->type->value,
                'type_label' => $a->type->label(),
                'organizer' => $a->organizer?->name,
                'starts_at' => $a->starts_at?->toIso8601String(),
                'ends_at' => $a->ends_at?->toIso8601String(),
                'location' => $a->location,
                'province' => $a->province?->name,
                'city' => $a->city?->name,
                'commune' => $a->commune?->name,
                'structure' => $a->structure?->name,
                'status' => $a->status->value,
                'participants_count' => $a->members_count,
                'attendances_count' => $a->attendances_count,
            ])->values()->all(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ];
    }

    public function activityDetail(User $user, Activity $activity): array
    {
        abort_unless($activity->isVisibleTo($user), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        $activity->load(['province', 'city', 'commune', 'structure', 'organizer']);
        $activity->loadCount(['members', 'attendances']);

        $memberCollection = $activity->members()
            ->with(['activeCard', 'province:id,name'])
            ->get();

        $participants = $memberCollection->map(fn (Member $m) => [
                'member_code' => $m->member_code,
                'full_name' => $m->full_name,
                'photo_url' => $m->photo_path ? route('media.member-photo', ['member' => $m->member_code]) : null,
                'status' => $m->status->label(),
                'role' => $m->pivot->role ?? 'participant',
                'pivot_status' => $m->pivot->status ?? null,
                'certified' => $m->status === MemberStatus::Active && $m->activeCard?->status === CardStatus::Active,
            ]);

        $attendanceByMember = $activity->attendances()->get()->keyBy('member_id');

        $classified = [
            'active_members' => $participants->filter(fn ($p) => ($p['role'] ?? '') === 'participant')->count(),
            'responsibles' => $participants->filter(fn ($p) => in_array($p['role'] ?? '', ['organizer', 'responsible', 'agent'], true))->count(),
            'guests' => $participants->filter(fn ($p) => ($p['role'] ?? '') === 'guest')->count(),
            'partners' => $participants->filter(fn ($p) => ($p['role'] ?? '') === 'partner')->count(),
        ];

        return [
            'activity' => [
                'id' => $activity->id,
                'code' => $activity->code,
                'title' => $activity->title,
                'type' => $activity->type->label(),
                'description' => $activity->description,
                'organizer' => $activity->organizer?->name,
                'starts_at' => $activity->starts_at?->toIso8601String(),
                'ends_at' => $activity->ends_at?->toIso8601String(),
                'location' => $activity->location,
                'province' => $activity->province?->name,
                'city' => $activity->city?->name,
                'commune' => $activity->commune?->name,
                'structure' => $activity->structure?->name,
            ],
            'participants' => [
                'total' => $participants->count(),
                'certified' => $participants->where('certified', true)->count(),
                'classification' => $classified,
                'list' => $participants->map(function (array $p) use ($attendanceByMember, $memberCollection) {
                    $member = $memberCollection->firstWhere('member_code', $p['member_code']);
                    $attendance = $member ? $attendanceByMember->get($member->id) : null;

                    return array_merge($p, [
                        'identification_method' => $attendance?->method,
                        'attendance_status' => $attendance?->status?->label(),
                    ]);
                })->values()->all(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function cards(User $user, array $filters): array
    {
        $base = MemberCard::query()->whereIn(
            'member_cards.member_id',
            Member::query()->visibleTo($user)->select('members.id'),
        );

        $byStatus = (clone $base)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $total = (int) $byStatus->sum();

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);
        $list = (clone $base)
            ->with(['member:id,member_code,last_name,first_name,province_id'])
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('member_cards.status', $v))
            ->latest('member_cards.issued_at')
            ->paginate($perPage);

        return [
            'summary' => [
                'total' => $total,
                'active' => (int) $byStatus->get(CardStatus::Active->value, 0),
                'expired' => (int) $byStatus->get(CardStatus::Expired->value, 0),
                'suspended' => (int) $byStatus->get(CardStatus::Suspended->value, 0),
                'lost' => (int) $byStatus->get(CardStatus::Lost->value, 0),
                'replaced' => (int) $byStatus->get(CardStatus::Replaced->value, 0),
                'inactive' => (int) $byStatus->get(CardStatus::Inactive->value, 0),
            ],
            'data' => $list->getCollection()->map(fn (MemberCard $card) => [
                'id' => $card->id,
                'card_number' => $card->card_number,
                'status' => $card->status->value,
                'status_label' => $card->status->label(),
                'issued_at' => $card->issued_at?->toDateString(),
                'expires_at' => $card->expires_at?->toDateString(),
                'member' => $card->member ? [
                    'member_code' => $card->member->member_code,
                    'full_name' => $card->member->full_name,
                ] : null,
            ])->values()->all(),
            'meta' => [
                'current_page' => $list->currentPage(),
                'last_page' => $list->lastPage(),
                'per_page' => $list->perPage(),
                'total' => $list->total(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function attendance(User $user, array $filters): array
    {
        $memberIds = Member::query()->visibleTo($user)->select('members.id');

        $attendanceQuery = Attendance::query()
            ->whereIn('member_id', $memberIds)
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->whereDate('recorded_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->whereDate('recorded_at', '<=', $v));

        $totalRecords = (int) (clone $attendanceQuery)->count();
        $present = (int) (clone $attendanceQuery)->where('status', AttendanceStatus::Present)->count();
        $absent = (int) (clone $attendanceQuery)->where('status', AttendanceStatus::Absent)->count();
        $activeMembers = (int) Member::query()->visibleTo($user)->where('status', MemberStatus::Active)->count();

        $byType = Activity::query()
            ->visibleTo($user)
            ->join('attendances', 'attendances.activity_id', '=', 'activities.id')
            ->whereIn('attendances.member_id', $memberIds)
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->whereDate('attendances.recorded_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->whereDate('attendances.recorded_at', '<=', $v))
            ->select(
                'activities.type',
                DB::raw('COUNT(DISTINCT activities.id) as activities_count'),
                DB::raw('COUNT(attendances.id) as attendances_count'),
                DB::raw("SUM(CASE WHEN attendances.status = 'present' THEN 1 ELSE 0 END) as present_count"),
            )
            ->groupBy('activities.type')
            ->get()
            ->map(function ($row) {
                $type = ActivityType::resolve($row->type);

                return [
                    'type' => $type->value,
                    'type_label' => $type->label(),
                    'activities_count' => (int) $row->activities_count,
                    'attendances_count' => (int) $row->attendances_count,
                    'present_count' => (int) $row->present_count,
                    'rate' => (int) $row->attendances_count > 0
                        ? round(((int) $row->present_count / (int) $row->attendances_count) * 100)
                        : 0,
                ];
            })
            ->values()
            ->all();

        return [
            'global' => [
                'active_members' => $activeMembers,
                'total_records' => $totalRecords,
                'present' => $present,
                'absent' => $absent,
                'participation_rate' => $totalRecords > 0 ? round(($present / $totalRecords) * 100) : 0,
            ],
            'by_activity_type' => $byType,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function attendanceByMember(User $user, Member $member): array
    {
        abort_unless($member->isVisibleTo($user), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        $records = $member->attendances()
            ->with('activity:id,title,type,starts_at,location')
            ->orderByDesc('recorded_at')
            ->get()
            ->groupBy(fn (Attendance $a) => $a->activity?->starts_at?->format('Y-m') ?? 'inconnu')
            ->map(fn ($group, $month) => [
                'month' => $month,
                'label' => $month !== 'inconnu'
                    ? \Illuminate\Support\Carbon::createFromFormat('Y-m', $month)->translatedFormat('F Y')
                    : 'Non daté',
                'entries' => $group->map(fn (Attendance $a) => [
                    'activity' => $a->activity?->title,
                    'date' => $a->activity?->starts_at?->toDateString(),
                    'location' => $a->activity?->location,
                    'status' => $a->status->label(),
                    'method' => $a->method,
                    'recorded_at' => $a->recorded_at?->toIso8601String(),
                ])->values()->all(),
            ])
            ->values()
            ->all();

        $present = $member->attendances()->where('status', AttendanceStatus::Present)->count();

        return [
            'member' => [
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
            ],
            'total_present' => $present,
            'history' => $records,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function users(User $user, array $filters = []): array
    {
        abort_unless($user->hasPermission(\App\Enums\Permission::UsersView), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        $base = User::query()->with('role:id,name,slug');

        $total = (int) $base->count();
        $active = (int) (clone $base)->where('is_active', true)->count();
        $suspended = (int) (clone $base)->where('is_active', false)->count();

        $byRole = (clone $base)
            ->join('roles', 'roles.id', '=', 'users.role_id')
            ->select('roles.name', 'roles.slug', DB::raw('COUNT(users.id) as total'))
            ->groupBy('roles.id', 'roles.name', 'roles.slug')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'role' => $row->name,
                'slug' => $row->slug,
                'total' => (int) $row->total,
            ])
            ->all();

        $perPage = min((int) ($filters['per_page'] ?? 10), 100);
        $recentPaginated = User::query()
            ->with('role:id,name')
            ->orderByDesc('last_login_at')
            ->paginate($perPage, ['id', 'name', 'email', 'role_id', 'is_active', 'last_login_at'], 'page', max(1, (int) ($filters['page'] ?? 1)));

        $recent = $recentPaginated->getCollection()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role?->name,
                'is_active' => $u->is_active,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ])
            ->all();

        return [
            'summary' => [
                'total' => $total,
                'active' => $active,
                'suspended' => $suspended,
            ],
            'by_role' => $byRole,
            'recent' => $recent,
            'recent_meta' => [
                'current_page' => $recentPaginated->currentPage(),
                'last_page' => $recentPaginated->lastPage(),
                'per_page' => $recentPaginated->perPage(),
                'total' => $recentPaginated->total(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    public function roles(User $user): array
    {
        abort_unless($user->hasPermission(\App\Enums\Permission::UsersView), 403, "Vous n'avez pas l'autorisation d'effectuer cette action.");

        return [
            'data' => Role::query()
                ->with('permissions:id,slug,name,module')
                ->withCount('users')
                ->orderBy('scope_level')
                ->get()
                ->map(fn (Role $role) => [
                    'id' => $role->id,
                    'slug' => $role->slug,
                    'name' => $role->name,
                    'description' => $role->description,
                    'scope_level' => $role->scope_level,
                    'users_count' => $role->users_count,
                    'permissions' => $role->permissions->map(fn ($p) => [
                        'slug' => $p->slug,
                        'name' => $p->name,
                        'module' => $p->module,
                    ])->values()->all(),
                ])
                ->all(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function applyMemberFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('members.status', $v))
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('members.province_id', $v))
            ->when($filters['city_id'] ?? null, fn (Builder $q, $v) => $q->where('members.city_id', $v))
            ->when($filters['commune_id'] ?? null, fn (Builder $q, $v) => $q->where('members.commune_id', $v))
            ->when($filters['zone_id'] ?? null, fn (Builder $q, $v) => $q->where('members.zone_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('members.structure_id', $v))
            ->when($filters['registered_from'] ?? null, fn (Builder $q, $v) => $q->whereDate('members.created_at', '>=', $v))
            ->when($filters['registered_to'] ?? null, fn (Builder $q, $v) => $q->whereDate('members.created_at', '<=', $v));

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
    }
}
