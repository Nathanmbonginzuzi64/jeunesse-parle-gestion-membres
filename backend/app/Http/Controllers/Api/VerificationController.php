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
            ->latest()
            ->paginate(min((int) ($filters['per_page'] ?? 20), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (VerificationLog $log) => [
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
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
