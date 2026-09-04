<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\User;
use App\Models\VerificationLog;
use App\Services\AuditLogger;
use App\Services\BiometricService;
use App\Services\VerificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class VerificationController extends Controller
{
    public function __construct(
        private readonly VerificationService $verification,
        private readonly BiometricService $biometrics,
        private readonly AuditLogger $audit,
    ) {}

    private function actor(Request $request): ?User
    {
        if ($request->user() instanceof User) {
            return $request->user();
        }

        $bearer = $request->bearerToken();
        if (! $bearer) {
            return null;
        }

        $access = PersonalAccessToken::findToken($bearer);
        $tokenable = $access?->tokenable;

        return $tokenable instanceof User ? $tokenable : null;
    }

    /**
     * Vérification d'une carte par son jeton QR.
     *
     * Accessible sans authentification (scan par un tiers) mais fortement limitée
     * en débit ; la charge utile renvoyée est réduite au strict nécessaire.
     * Si un Bearer agent est présent, l'historique et les notifs admin sont renseignés.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Jeton QR opaque OU code membre JP-RDC-… OU URL de vérification.
            'token' => ['required', 'string', 'min:8', 'max:255'],
        ], [
            'token.required' => 'Saisissez un code membre (JP-RDC-…) ou un jeton QR.',
            'token.min' => 'Identifiant trop court. Utilisez le code JP-RDC ou le QR de la carte.',
            'token.max' => 'Identifiant trop long.',
        ]);

        $actor = $this->actor($request);

        $result = $this->verification->verify(
            $validated['token'],
            $request,
            $actor,
            $actor ? 'agent' : 'public',
        );

        return response()->json($result, $result['valid'] ? 200 : 404);
    }

    public function verifyByToken(Request $request, string $token): JsonResponse
    {
        $request->merge(['token' => $token]);

        return $this->verify($request);
    }

    /**
     * Vérification d'identité par empreinte (code membre + échantillon).
     * Le matching est exclusivement serveur.
     */
    public function verifyFingerprint(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'member_code' => ['required', 'string', 'max:40'],
            'template_hash' => ['nullable', 'string', 'min:8', 'max:255'],
            'format' => ['nullable', 'string', 'in:hardware,simulation'],
        ]);

        $code = mb_strtoupper(trim($validated['member_code']));
        $format = $validated['format'] ?? 'hardware';

        $member = Member::query()->where('member_code', $code)->first();

        if (! $member) {
            return response()->json([
                'valid' => false,
                'message' => 'Aucun membre trouvé pour cet identifiant.',
                'matched_slot' => null,
                'member_code' => $code,
                'member_id' => null,
                'full_name' => null,
                'fingerprints_enrolled' => 0,
            ], 422);
        }

        $enrolled = $this->biometrics->countForMember($member);

        if ($enrolled === 0) {
            return response()->json([
                'valid' => false,
                'message' => 'Aucune empreinte enregistrée pour ce membre.',
                'matched_slot' => null,
                'member_code' => $member->member_code,
                'member_id' => $member->id,
                'full_name' => $member->full_name,
                'fingerprints_enrolled' => 0,
            ], 422);
        }

        try {
            $match = $this->biometrics->matchMember($member, $validated['template_hash'] ?? null, $format);
        } catch (ValidationException $e) {
            return response()->json([
                'valid' => false,
                'message' => collect($e->errors())->flatten()->first() ?? 'Empreinte non reconnue.',
                'matched_slot' => null,
                'member_code' => $member->member_code,
                'member_id' => $member->id,
                'full_name' => $member->full_name,
                'fingerprints_enrolled' => $enrolled,
            ], 422);
        }

        $this->audit->log(
            'biometric.verified',
            $member,
            "Vérification empreinte {$member->member_code}".($match['lab'] ? ' (lab)' : ''),
        );

        return response()->json([
            'valid' => true,
            'message' => 'Empreinte reconnue — identité confirmée.',
            'matched_slot' => $match['matched']?->position,
            'member_code' => $member->member_code,
            'member_id' => $member->id,
            'full_name' => $member->full_name,
            'fingerprints_enrolled' => $enrolled,
        ]);
    }

    /**
     * Historique paginé des vérifications pour l'agent connecté.
     * Les comptes avec audit.view voient tout le journal ; sinon uniquement leurs scans.
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            ! $user->hasPermission(Permission::CardsVerify)
            && ! $user->hasPermission(Permission::AuditView)
        ) {
            abort(403, "Vous n'avez pas l'autorisation d'effectuer cette action.");
        }

        $filters = $request->validate([
            'result' => ['nullable', 'string', 'in:valid,not_found,revoked,expired,inactive,rejected'],
            'context' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $logs = VerificationLog::query()
            ->with([
                'member:id,member_code,last_name,middle_name,first_name,photo_path',
                'verifier:id,name',
            ])
            ->when(
                ! $user->hasPermission(Permission::AuditView),
                fn (Builder $q) => $q->where('verified_by', $user->id),
            )
            ->when($filters['result'] ?? null, function (Builder $q, string $result) {
                if ($result === 'rejected') {
                    $q->where('result', '!=', 'valid');

                    return;
                }

                $q->where('result', $result);
            })
            ->when($filters['context'] ?? null, fn (Builder $q, $v) => $q->where('context', $v))
            ->when($filters['q'] ?? null, function (Builder $q, string $search) {
                $term = '%'.mb_strtolower(trim($search)).'%';
                $q->where(function (Builder $inner) use ($term) {
                    $inner->whereHas('member', function (Builder $member) use ($term) {
                        $member->whereRaw('LOWER(member_code) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(first_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(middle_name) LIKE ?', [$term])
                            ->orWhereRaw("LOWER(CONCAT(COALESCE(last_name,''),' ',COALESCE(middle_name,''),' ',COALESCE(first_name,''))) LIKE ?", [$term]);
                    });
                });
            })
            ->latest()
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (VerificationLog $log) => $this->serializeHistoryRow($log)),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Liste distincte des membres déjà vérifiés (succès) par l'agent, avec recherche.
     */
    public function verifiedMembers(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            ! $user->hasPermission(Permission::CardsVerify)
            && ! $user->hasPermission(Permission::AuditView)
        ) {
            abort(403, "Vous n'avez pas l'autorisation d'effectuer cette action.");
        }

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = min((int) ($filters['per_page'] ?? 25), 100);
        $search = isset($filters['q']) ? trim($filters['q']) : '';

        $base = VerificationLog::query()
            ->where('result', 'valid')
            ->whereNotNull('member_id')
            ->when(
                ! $user->hasPermission(Permission::AuditView),
                fn (Builder $q) => $q->where('verified_by', $user->id),
            );

        $memberIds = (clone $base)
            ->selectRaw('member_id, MAX(id) as last_log_id, COUNT(*) as verifications_count, MAX(created_at) as last_verified_at')
            ->groupBy('member_id');

        if ($search !== '') {
            $term = '%'.mb_strtolower($search).'%';
            $memberIds->whereHas('member', function (Builder $member) use ($term) {
                $member->whereRaw('LOWER(member_code) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(first_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(middle_name) LIKE ?', [$term]);
            });
        }

        $page = max(1, (int) ($filters['page'] ?? 1));
        $total = (clone $memberIds)->get()->count();
        $rows = (clone $memberIds)
            ->orderByDesc('last_verified_at')
            ->forPage($page, $perPage)
            ->get();

        $logs = VerificationLog::query()
            ->with([
                'member:id,member_code,last_name,middle_name,first_name,photo_path,structure_id,status',
                'member.structure:id,name',
            ])
            ->whereIn('id', $rows->pluck('last_log_id'))
            ->get()
            ->keyBy('id');

        $data = $rows->map(function ($row) use ($logs) {
            $log = $logs->get($row->last_log_id);
            $member = $log?->member;

            return [
                'member_id' => (int) $row->member_id,
                'member_code' => $member?->member_code,
                'full_name' => $member?->full_name,
                'photo_url' => $member?->photo_path
                    ? route('media.member-photo', ['member' => $member->member_code])
                    : null,
                'structure' => $member?->structure?->name,
                'status' => $member?->status?->value ?? $member?->status,
                'verifications_count' => (int) $row->verifications_count,
                'last_verified_at' => $row->last_verified_at
                    ? \Illuminate\Support\Carbon::parse($row->last_verified_at)->toIso8601String()
                    : null,
                'last_context' => $log?->context,
                'last_result' => $log?->result,
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /**
     * Tableau de bord agent : KPIs + série 7 jours (vérifs / présences).
     */
    public function agentDashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        if (
            ! $user->hasPermission(Permission::CardsVerify)
            && ! $user->hasPermission(Permission::AttendanceView)
            && ! $user->hasPermission(Permission::AttendanceRecord)
        ) {
            abort(403, "Vous n'avez pas l'autorisation d'effectuer cette action.");
        }

        $user->loadMissing(['role', 'member:id,member_code,photo_path']);

        $todayStart = now()->startOfDay();
        $weekStart = now()->subDays(6)->startOfDay();

        $verifyScope = VerificationLog::query()
            ->when(
                ! $user->hasPermission(Permission::AuditView),
                fn (Builder $q) => $q->where('verified_by', $user->id),
            );

        $attendanceScope = \App\Models\Attendance::query()
            ->where('recorded_by', $user->id)
            ->whereIn('status', [
                \App\Enums\AttendanceStatus::Present->value,
                \App\Enums\AttendanceStatus::Late->value,
            ]);

        $verificationsToday = (clone $verifyScope)->where('created_at', '>=', $todayStart)->count();
        $validToday = (clone $verifyScope)->where('created_at', '>=', $todayStart)->where('result', 'valid')->count();
        $rejectedToday = max(0, $verificationsToday - $validToday);
        $presentsToday = (clone $attendanceScope)->where('recorded_at', '>=', $todayStart)->count();

        $verificationsWeek = (clone $verifyScope)->where('created_at', '>=', $weekStart)->count();
        $presentsWeek = (clone $attendanceScope)->where('recorded_at', '>=', $weekStart)->count();
        $membersVerified = (clone $verifyScope)
            ->where('result', 'valid')
            ->whereNotNull('member_id')
            ->selectRaw('COUNT(DISTINCT member_id) as aggregate')
            ->value('aggregate') ?? 0;

        $labels = [];
        $verificationsSeries = [];
        $presentsSeries = [];
        $validSeries = [];

        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $labels[] = $day->locale('fr')->isoFormat('dd D');
            $from = $day->copy()->startOfDay();
            $to = $day->copy()->endOfDay();

            $verificationsSeries[] = (clone $verifyScope)
                ->whereBetween('created_at', [$from, $to])
                ->count();
            $validSeries[] = (clone $verifyScope)
                ->whereBetween('created_at', [$from, $to])
                ->where('result', 'valid')
                ->count();
            $presentsSeries[] = (clone $attendanceScope)
                ->whereBetween('recorded_at', [$from, $to])
                ->count();
        }

        return response()->json([
            'kpis' => [
                'verifications_today' => $verificationsToday,
                'valid_today' => $validToday,
                'rejected_today' => $rejectedToday,
                'presents_today' => $presentsToday,
                'verifications_week' => $verificationsWeek,
                'presents_week' => $presentsWeek,
                'members_verified' => $membersVerified,
            ],
            'chart' => [
                'labels' => $labels,
                'verifications' => $verificationsSeries,
                'valid' => $validSeries,
                'presents' => $presentsSeries,
            ],
            'agent' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'photo_url' => $user->photoUrl(),
                'role' => $user->role?->name,
                'member_code' => $user->member?->member_code,
                'member_id' => $user->member_id,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function serializeHistoryRow(VerificationLog $log): array
    {
        return [
            'id' => $log->id,
            'result' => $log->result,
            'context' => $log->context,
            'member' => $log->member ? [
                'id' => $log->member->id,
                'member_code' => $log->member->member_code,
                'full_name' => $log->member->full_name,
                'photo_url' => $log->member->photo_path
                    ? route('media.member-photo', ['member' => $log->member->member_code])
                    : null,
            ] : null,
            'verified_by' => $log->verifier?->name,
            'ip_address' => $log->ip_address,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }
}
