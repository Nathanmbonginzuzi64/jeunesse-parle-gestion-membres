<?php

namespace App\Http\Controllers\Api;

use App\Enums\MemberStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Models\Member;
use App\Services\AuditLogger;
use App\Services\DuplicateDetector;
use App\Services\MemberService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MemberController extends Controller
{
    /** Colonnes autorisées au tri : évite toute injection via le paramètre `sort`. */
    private const SORTABLE = [
        'created_at', 'member_code', 'last_name', 'first_name', 'status', 'joined_at',
    ];

    private const PER_PAGE_MAX = 100;

    public function __construct(
        private readonly MemberService $members,
        private readonly DuplicateDetector $duplicates,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Member::class);

        $filters = $this->validateFilters($request);

        $query = Member::query()
            ->visibleTo($request->user())
            ->with(['province:id,name', 'city:id,name', 'commune:id,name', 'structure:id,name,code', 'activeCard'])
            ->search($filters['q'] ?? null);

        $this->applyFilters($query, $filters);

        $sort = $filters['sort'] ?? 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $perPage = min((int) ($filters['per_page'] ?? 20), self::PER_PAGE_MAX);

        $members = $query->orderBy($sort, $direction)->paginate($perPage)->withQueryString();

        return MemberResource::collection($members);
    }

    public function store(StoreMemberRequest $request): JsonResponse
    {
        $data = $request->validated();

        $matches = $this->duplicates->findMatches($data);

        if ($matches->isNotEmpty() && ! $request->boolean('confirm_duplicate')) {
            return response()->json([
                'message' => 'Un membre potentiellement similaire existe déjà.',
                'duplicates' => $matches,
                'requires_confirmation' => true,
            ], 409);
        }

        unset($data['confirm_duplicate'], $data['photo']);

        $member = $this->members->create($data, $request->user(), $request->file('photo'));

        return response()->json([
            'message' => 'Membre enregistré avec succès.',
            'data' => new MemberResource($member->load(['province', 'city', 'commune', 'structure'])),
        ], 201);
    }

    public function show(Request $request, Member $member): JsonResponse
    {
        $this->authorize('view', $member);

        $member->load([
            'province', 'city', 'commune', 'zone', 'avenue', 'structure',
            'supervisor:id,member_code,last_name,first_name',
            'validator:id,name', 'registrar:id,name',
            'cards', 'activeCard',
            'statusHistories.author:id,name',
        ]);

        return response()->json([
            'data' => new MemberResource($member),
            'history' => $member->statusHistories->map(fn ($h) => [
                'from' => $h->from_status,
                'to' => $h->to_status,
                'reason' => $h->reason,
                'author' => $h->author?->name,
                'at' => $h->created_at?->toIso8601String(),
            ]),
            'cards' => \App\Http\Resources\MemberCardResource::collection($member->cards),
        ]);
    }

    public function update(UpdateMemberRequest $request, Member $member): JsonResponse
    {
        $data = $request->validated();
        unset($data['photo']);

        $updated = $this->members->update($member, $data, $request->user(), $request->file('photo'));

        return response()->json([
            'message' => 'Membre mis à jour.',
            'data' => new MemberResource($updated->load(['province', 'city', 'commune', 'structure', 'activeCard'])),
        ]);
    }

    /** Suppression logique : le dossier reste consultable pour l'audit. */
    public function destroy(Request $request, Member $member): JsonResponse
    {
        $this->authorize('delete', $member);

        $member->delete();

        $this->audit->log('member.deleted', $member, "Archivage technique de {$member->member_code}");

        return response()->json(['message' => 'Membre supprimé.']);
    }

    public function validateMember(Request $request, Member $member): JsonResponse
    {
        $this->authorize('validate', $member);

        $updated = $this->members->validate($member, $request->user());

        return response()->json([
            'message' => 'Membre validé. Sa carte et son QR code ont été générés.',
            'data' => new MemberResource($updated->load(['province', 'structure', 'activeCard'])),
        ]);
    }

    /** Valide plusieurs dossiers en attente (inscriptions mobiles / en masse). */
    public function bulkValidate(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Member::class);

        $validated = $request->validate([
            'member_ids' => ['nullable', 'array', 'max:200'],
            'member_ids.*' => ['integer', 'exists:members,id'],
            'all_pending_mobile' => ['nullable', 'boolean'],
        ]);

        $query = Member::query()
            ->visibleTo($request->user())
            ->where('status', MemberStatus::Pending->value);

        if (! empty($validated['all_pending_mobile'])) {
            $query->where(function (Builder $q) {
                $q->where('registration_channel', 'mobile')
                    ->orWhere(function (Builder $inner) {
                        $inner->whereNull('registration_channel')
                            ->whereNull('registered_by')
                            ->whereNotNull('user_id');
                    });
            });
        } elseif (! empty($validated['member_ids'])) {
            $query->whereIn('id', $validated['member_ids']);
        } else {
            return response()->json([
                'message' => 'Sélectionnez au moins un dossier ou activez « tout approuver ».',
            ], 422);
        }

        $author = $request->user();
        $validatedCount = 0;
        $failed = [];

        foreach ($query->orderBy('id')->get() as $member) {
            if (! $author->can('validate', $member)) {
                $failed[] = ['id' => $member->id, 'reason' => 'Permission refusée'];
                continue;
            }

            try {
                $this->members->validate($member, $author);
                $validatedCount++;
            } catch (\Throwable $e) {
                $failed[] = ['id' => $member->id, 'reason' => $e->getMessage()];
            }
        }

        return response()->json([
            'message' => $validatedCount === 0
                ? 'Aucun dossier n\'a pu être validé.'
                : "{$validatedCount} dossier(s) approuvé(s).",
            'validated_count' => $validatedCount,
            'failed' => $failed,
        ]);
    }

    /**
     * KPI + rapport d'inscriptions mobiles (jour / mois / année) pour le super-admin.
     */
    public function mobileStats(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Member::class);

        $validated = $request->validate([
            'group_by' => ['nullable', Rule::in(['day', 'month', 'year'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $groupBy = $validated['group_by'] ?? 'day';
        $base = $this->mobileRegistrationsQuery($request->user());

        $kpis = [
            'total' => (clone $base)->count(),
            'pending' => (clone $base)->where('status', MemberStatus::Pending->value)->count(),
            'active' => (clone $base)->where('status', MemberStatus::Active->value)->count(),
            'suspended' => (clone $base)->where('status', MemberStatus::Suspended->value)->count(),
            'today' => (clone $base)->whereDate('created_at', now()->toDateString())->count(),
            'this_month' => (clone $base)
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', now()->month)
                ->count(),
            'this_year' => (clone $base)->whereYear('created_at', now()->year)->count(),
        ];

        $reportQuery = $this->mobileRegistrationsQuery($request->user());

        if (! empty($validated['from'])) {
            $reportQuery->whereDate('created_at', '>=', $validated['from']);
        }
        if (! empty($validated['to'])) {
            $reportQuery->whereDate('created_at', '<=', $validated['to']);
        }
        if (! empty($validated['year'])) {
            $reportQuery->whereYear('created_at', (int) $validated['year']);
        }
        if (! empty($validated['month']) && $groupBy === 'day') {
            $reportQuery->whereMonth('created_at', (int) $validated['month']);
            if (empty($validated['year'])) {
                $reportQuery->whereYear('created_at', now()->year);
            }
        }

        $periodExpr = $this->periodExpression('created_at', $groupBy);
        $pending = MemberStatus::Pending->value;
        $active = MemberStatus::Active->value;

        $rows = $reportQuery
            ->selectRaw(
                "{$periodExpr} as period, COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active",
                [$pending, $active],
            )
            ->groupBy(DB::raw($periodExpr))
            ->orderByDesc(DB::raw($periodExpr))
            ->limit(366)
            ->get();

        $report = $rows->map(function ($row) use ($groupBy) {
            $period = (string) $row->period;

            return [
                'period' => $period,
                'label' => $this->periodLabel($period, $groupBy),
                'total' => (int) $row->total,
                'pending' => (int) $row->pending,
                'active' => (int) $row->active,
            ];
        })->values();

        return response()->json([
            'kpis' => $kpis,
            'group_by' => $groupBy,
            'report' => $report,
        ]);
    }

    public function changeStatus(Request $request, Member $member): JsonResponse
    {
        $this->authorize('changeStatus', $member);

        $validated = $request->validate([
            'status' => ['required', Rule::in(MemberStatus::values())],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $updated = $this->members->changeStatus(
            $member,
            MemberStatus::from($validated['status']),
            $validated['reason'] ?? null,
            $request->user(),
        );

        return response()->json([
            'message' => 'Statut mis à jour.',
            'data' => new MemberResource($updated->load(['province', 'structure', 'activeCard'])),
        ]);
    }

    /** Contrôle de doublon à la volée, appelé pendant la saisie du formulaire. */
    public function checkDuplicates(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Member::class);

        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'string', 'max:160'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'first_name' => ['nullable', 'string', 'max:80'],
            'birth_date' => ['nullable', 'date'],
            'ignore_member_id' => ['nullable', 'integer'],
        ]);

        $matches = $this->duplicates->findMatches($validated, $validated['ignore_member_id'] ?? null);

        return response()->json([
            'has_duplicates' => $matches->isNotEmpty(),
            'duplicates' => $matches,
        ]);
    }

    public function timeline(Request $request, Member $member): JsonResponse
    {
        $this->authorize('view', $member);

        $events = collect();

        foreach ($member->statusHistories()->with('author:id,name')->get() as $history) {
            $events->push([
                'type' => 'status',
                'label' => 'Statut : '.($history->from_status ?? 'création').' → '.$history->to_status,
                'detail' => $history->reason,
                'author' => $history->author?->name,
                'at' => $history->created_at?->toIso8601String(),
            ]);
        }

        foreach ($member->cards as $card) {
            $events->push([
                'type' => 'card',
                'label' => "Carte {$card->card_number} — {$card->status->label()}",
                'detail' => $card->status_reason,
                'author' => null,
                'at' => $card->created_at?->toIso8601String(),
            ]);
        }

        foreach ($member->attendances()->with('activity:id,title,starts_at')->latest('recorded_at')->limit(50)->get() as $attendance) {
            $events->push([
                'type' => 'attendance',
                'label' => $attendance->activity?->title.' — '.$attendance->status->label(),
                'detail' => $attendance->note,
                'author' => null,
                'at' => $attendance->recorded_at?->toIso8601String(),
            ]);
        }

        foreach ($member->verificationLogs()->limit(20)->get() as $log) {
            $events->push([
                'type' => 'verification',
                'label' => 'Vérification QR : '.$log->result,
                'detail' => $log->context,
                'author' => null,
                'at' => $log->created_at?->toIso8601String(),
            ]);
        }

        return response()->json([
            'data' => $events->sortByDesc('at')->values(),
        ]);
    }

    /**
     * Export CSV en flux : la mémoire reste constante quel que soit le volume,
     * et le nombre de lignes est plafonné par configuration.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize('export', Member::class);

        $filters = $this->validateFilters($request);
        $user = $request->user();

        $query = Member::query()
            ->visibleTo($user)
            ->with(['province:id,name', 'city:id,name', 'commune:id,name', 'structure:id,name'])
            ->search($filters['q'] ?? null);

        $this->applyFilters($query, $filters);

        $limit = (int) config('jeunesse.export.max_rows');
        $includeContact = $user->hasPermission(\App\Enums\Permission::MembersViewSensitive);

        $this->audit->log(
            'member.exported',
            null,
            'Export CSV des membres'.($includeContact ? ' (avec coordonnées)' : ' (sans coordonnées)'),
            [],
            ['filters' => $filters],
        );

        $filename = 'membres-jeunesse-parle-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query, $limit, $includeContact) {
            $handle = fopen('php://output', 'wb');

            // BOM UTF-8 : Excel affiche correctement les accents.
            fwrite($handle, "\xEF\xBB\xBF");

            $headers = ['ID membre', 'Nom', 'Postnom', 'Prénom', 'Sexe', 'Statut', 'Province', 'Ville', 'Commune', 'Structure', 'Profession', 'Date adhésion'];

            if ($includeContact) {
                array_splice($headers, 5, 0, ['Téléphone', 'E-mail']);
            }

            fputcsv($handle, $headers, ';');

            $query->orderBy('members.id')->limit($limit)->chunk(500, function ($members) use ($handle, $includeContact) {
                foreach ($members as $member) {
                    $row = [
                        $member->member_code,
                        $member->last_name,
                        $member->middle_name,
                        $member->first_name,
                        $member->gender?->label(),
                        $member->status->label(),
                        $member->province?->name,
                        $member->city?->name,
                        $member->commune?->name,
                        $member->structure?->name,
                        $member->profession,
                        $member->joined_at?->toDateString(),
                    ];

                    if ($includeContact) {
                        array_splice($row, 5, 0, [$member->phone, $member->email]);
                    }

                    fputcsv($handle, $row, ';');
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    // ------------------------------------------------------------------ Filtrage

    private function validateFilters(Request $request): array
    {
        if ($request->has('self_registered')) {
            $request->merge([
                'self_registered' => filter_var(
                    $request->input('self_registered'),
                    FILTER_VALIDATE_BOOLEAN,
                    FILTER_NULL_ON_FAILURE,
                ),
            ]);
        }

        return $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(MemberStatus::values())],
            'province_id' => ['nullable', 'integer'],
            'city_id' => ['nullable', 'integer'],
            'commune_id' => ['nullable', 'integer'],
            'zone_id' => ['nullable', 'integer'],
            'structure_id' => ['nullable', 'integer'],
            'gender' => ['nullable', Rule::in(['M', 'F'])],
            'profession' => ['nullable', 'string', 'max:120'],
            'skill' => ['nullable', 'string', 'max:60'],
            'age_min' => ['nullable', 'integer', 'min:0', 'max:120'],
            'age_max' => ['nullable', 'integer', 'min:0', 'max:120'],
            'registered_from' => ['nullable', 'date'],
            'registered_to' => ['nullable', 'date'],
            'registration_channel' => ['nullable', Rule::in(['mobile', 'web', 'admin'])],
            'self_registered' => ['nullable', 'boolean'],
            'has_card' => ['nullable', 'boolean'],
            'sort' => ['nullable', Rule::in(self::SORTABLE)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::PER_PAGE_MAX],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
    }

    private function applyFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['status'] ?? null, fn (Builder $q, $v) => $q->where('members.status', $v))
            ->when($filters['province_id'] ?? null, fn (Builder $q, $v) => $q->where('members.province_id', $v))
            ->when($filters['city_id'] ?? null, fn (Builder $q, $v) => $q->where('members.city_id', $v))
            ->when($filters['commune_id'] ?? null, fn (Builder $q, $v) => $q->where('members.commune_id', $v))
            ->when($filters['zone_id'] ?? null, fn (Builder $q, $v) => $q->where('members.zone_id', $v))
            ->when($filters['structure_id'] ?? null, fn (Builder $q, $v) => $q->where('members.structure_id', $v))
            ->when($filters['gender'] ?? null, fn (Builder $q, $v) => $q->where('members.gender', $v))
            ->when($filters['profession'] ?? null, fn (Builder $q, $v) => $q->where('members.profession', 'like', '%'.$v.'%'))
            ->when($filters['skill'] ?? null, fn (Builder $q, $v) => $q->where('members.skills', 'like', '%'.$v.'%'))
            ->when($filters['registered_from'] ?? null, fn (Builder $q, $v) => $q->whereDate('members.created_at', '>=', $v))
            ->when($filters['registered_to'] ?? null, fn (Builder $q, $v) => $q->whereDate('members.created_at', '<=', $v))
            ->when($filters['registration_channel'] ?? null, fn (Builder $q, $v) => $q->where('members.registration_channel', $v));

        if (! empty($filters['self_registered'])) {
            $query->where(function (Builder $q) {
                $q->where('members.registration_channel', 'mobile')
                    ->orWhere(function (Builder $inner) {
                        $inner->whereNull('members.registration_channel')
                            ->whereNull('members.registered_by')
                            ->whereNotNull('members.user_id');
                    });
            });
        }

        if (isset($filters['age_min'])) {
            $query->whereDate('members.birth_date', '<=', now()->subYears((int) $filters['age_min'])->toDateString());
        }

        if (isset($filters['age_max'])) {
            $query->whereDate('members.birth_date', '>', now()->subYears((int) $filters['age_max'] + 1)->toDateString());
        }

        if (array_key_exists('has_card', $filters) && $filters['has_card'] !== null) {
            $filters['has_card']
                ? $query->whereHas('activeCard')
                : $query->whereDoesntHave('activeCard');
        }
    }

    private function mobileRegistrationsQuery(\App\Models\User $user): Builder
    {
        return Member::query()
            ->visibleTo($user)
            ->where(function (Builder $q) {
                $q->where('registration_channel', 'mobile')
                    ->orWhere(function (Builder $inner) {
                        $inner->whereNull('registration_channel')
                            ->whereNull('registered_by')
                            ->whereNotNull('user_id');
                    });
            });
    }

    private function periodExpression(string $column, string $groupBy): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return match ($groupBy) {
                'year' => "strftime('%Y', {$column})",
                'month' => "strftime('%Y-%m', {$column})",
                default => "strftime('%Y-%m-%d', {$column})",
            };
        }

        return match ($groupBy) {
            'year' => "DATE_FORMAT({$column}, '%Y')",
            'month' => "DATE_FORMAT({$column}, '%Y-%m')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    private function periodLabel(string $period, string $groupBy): string
    {
        try {
            return match ($groupBy) {
                'year' => $period,
                'month' => \Illuminate\Support\Carbon::createFromFormat('Y-m', $period)
                    ->locale('fr')
                    ->translatedFormat('F Y'),
                default => \Illuminate\Support\Carbon::createFromFormat('Y-m-d', $period)
                    ->locale('fr')
                    ->translatedFormat('d M Y'),
            };
        } catch (\Throwable) {
            return $period;
        }
    }
}
