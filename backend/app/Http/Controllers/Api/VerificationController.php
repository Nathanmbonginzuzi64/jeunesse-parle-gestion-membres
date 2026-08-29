<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Services\AuditLogger;
use App\Services\BiometricService;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerificationController extends Controller
{
    public function __construct(
        private readonly VerificationService $verification,
        private readonly BiometricService $biometrics,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Vérification d'une carte par son jeton QR.
     *
     * Accessible sans authentification (scan par un tiers) mais fortement limitée
     * en débit ; la charge utile renvoyée est réduite au strict nécessaire.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'min:16', 'max:64', 'alpha_num'],
        ]);

        $result = $this->verification->verify(
            $validated['token'],
            $request,
            $request->user(),
            $request->user() ? 'agent' : 'public',
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
}
