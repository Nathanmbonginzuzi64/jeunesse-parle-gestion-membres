<?php

namespace App\Http\Controllers\Api;

use App\Enums\BiometricContext;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\User;
use App\Services\ContextualBiometricService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class BiometricController extends Controller
{
    public function __construct(private readonly ContextualBiometricService $biometrics) {}

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

    private function authorizeRecordAttendance(User $actor, Activity $activity): void
    {
        if (! Gate::forUser($actor)->allows('recordAttendance', $activity)) {
            throw ValidationException::withMessages([
                'context' => 'Vous n\'avez pas l\'autorisation de pointer les présences pour cette activité.',
            ]);
        }
    }

    /** Options WebAuthn pour enregistrer la biométrie d'un futur membre (formulaire). */
    public function memberEnrollmentOptions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enrollment_key' => ['required', 'string', 'max:80'],
            'user_name' => ['required', 'string', 'max:160'],
            'display_name' => ['required', 'string', 'max:120'],
        ]);

        return response()->json($this->biometrics->memberEnrollmentOptions(
            $validated['enrollment_key'],
            $validated['user_name'],
            $validated['display_name'],
        ));
    }

    /** Finalise l'enregistrement biométrique d'un futur membre (juste après Windows Hello). */
    public function memberEnrollmentComplete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enrollment_key' => ['required', 'string', 'max:80'],
            'clientDataJSON' => ['required', 'string'],
            'attestationObject' => ['required', 'string'],
            'transports' => ['nullable', 'array'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $this->biometrics->finalizeMemberEnrollment((object) $validated);

        return response()->json([
            'ok' => true,
            'message' => 'Biométrie enregistrée.',
            'enrollment_key' => $validated['enrollment_key'],
        ]);
    }

    /** Options WebAuthn pour enregistrer Windows Hello / passkey. */
    public function registrationOptions(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json($this->biometrics->registrationOptions($user));
    }

    /** Finalise l'enregistrement du credential. */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'clientDataJSON' => ['required', 'string'],
            'attestationObject' => ['required', 'string'],
            'transports' => ['nullable', 'array'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        $credential = $this->biometrics->completeRegistration(
            $request->user(),
            (object) $validated,
            $request,
        );

        $request->user()->forceFill(['must_confirm_biometric' => false])->save();

        return response()->json([
            'ok' => true,
            'message' => 'Biométrie configurée.',
            'context' => BiometricContext::BiometricRegistration->value,
            'credential' => [
                'id' => $credential->id,
                'device_name' => $credential->device_name,
                'created_at' => $credential->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /** Options d'authentification / identification selon le contexte. */
    public function authenticationOptions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'context' => ['required', 'string', Rule::in(array_column(BiometricContext::cases(), 'value'))],
            'activity_id' => ['nullable', 'integer', 'exists:activities,id'],
        ]);

        $context = BiometricContext::from($validated['context']);
        $actor = $this->actor($request);

        if ($context === BiometricContext::Attendance && ! $actor) {
            throw ValidationException::withMessages([
                'context' => 'Authentification requise pour le pointage biométrique.',
            ]);
        }

        if ($context === BiometricContext::Attendance) {
            $request->setUserResolver(fn () => $actor);
            $activityId = $validated['activity_id'] ?? null;
            if (! $activityId) {
                throw ValidationException::withMessages([
                    'activity_id' => 'Activité requise pour le pointage biométrique.',
                ]);
            }
            $this->authorizeRecordAttendance($actor, Activity::findOrFail($activityId));
        }

        if ($context === BiometricContext::SecurityConfirmation && ! $actor) {
            throw ValidationException::withMessages([
                'context' => 'Authentification requise pour confirmer votre empreinte.',
            ]);
        }

        if ($context === BiometricContext::BiometricRegistration) {
            throw ValidationException::withMessages([
                'context' => 'Utilisez /biometrics/register/options pour la configuration.',
            ]);
        }

        return response()->json($this->biometrics->authenticationOptions($context, $actor));
    }

    /**
     * Assertion WebAuthn + exécution de l'action contextuelle.
     * LOGIN crée une session ; VERIFICATION / ATTENDANCE n'en créent pas.
     */
    public function authenticate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'context' => ['required', 'string', Rule::in(array_column(BiometricContext::cases(), 'value'))],
            'challenge_key' => ['required', 'string', 'max:80'],
            'id' => ['required', 'string'],
            'rawId' => ['nullable', 'string'],
            'clientDataJSON' => ['required', 'string'],
            'authenticatorData' => ['required', 'string'],
            'signature' => ['required', 'string'],
            'userHandle' => ['nullable', 'string'],
            'activity_id' => ['nullable', 'integer', 'exists:activities,id', 'required_if:context,ATTENDANCE'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ]);

        $context = BiometricContext::from($validated['context']);
        $actor = $this->actor($request);
        $activity = null;

        if ($context === BiometricContext::Attendance) {
            if (! $actor) {
                throw ValidationException::withMessages([
                    'context' => 'Un responsable connecté est requis.',
                ]);
            }
            if (empty($validated['activity_id'])) {
                throw ValidationException::withMessages([
                    'activity_id' => 'Activité requise pour le pointage biométrique.',
                ]);
            }
            $request->setUserResolver(fn () => $actor);
            $activity = Activity::findOrFail($validated['activity_id']);
            $this->authorizeRecordAttendance($actor, $activity);
        } else {
            $activity = null;
        }

        // Pour ATTENDANCE, l'acteur connecté doit être celui qui pointe (pas le membre scanné).
        if ($actor && $context === BiometricContext::Attendance) {
            $request->setUserResolver(fn () => $actor);
        }

        $result = $this->biometrics->completeAuthentication(
            $context,
            $validated['challenge_key'],
            (object) $validated,
            $request,
            $activity,
        );

        if ($context === BiometricContext::SecurityConfirmation && $actor) {
            $actor->forceFill(['must_confirm_biometric' => false])->save();
        }

        return response()->json($result);
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->biometrics->listCredentials($request->user()),
        ]);
    }

    public function destroy(Request $request, int $credential): JsonResponse
    {
        $this->biometrics->revokeCredential($request->user(), $credential);

        return response()->json(['message' => 'Credential biométrique révoqué.']);
    }
}
