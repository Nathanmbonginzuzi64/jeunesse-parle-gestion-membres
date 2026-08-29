<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\VerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VerificationController extends Controller
{
    public function __construct(private readonly VerificationService $verification) {}

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
}
