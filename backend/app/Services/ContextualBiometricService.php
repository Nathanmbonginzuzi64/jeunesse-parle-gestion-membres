<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\BiometricContext;
use App\Enums\MemberStatus;
use App\Http\Resources\UserResource;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Member;
use App\Models\User;
use App\Models\WebAuthnCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use lbuchs\WebAuthn\Binary\ByteBuffer;
use lbuchs\WebAuthn\WebAuthn;
use lbuchs\WebAuthn\WebAuthnException;

/**
 * Infrastructure biometrique unique (WebAuthn / Windows Hello).
 * Le contexte dÃ©termine l'action aprÃ¨s identification du credential.
 */
class ContextualBiometricService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
    ) {}

    public function makeWebAuthn(): WebAuthn
    {
        $rpId = $this->relyingPartyId();

        return new WebAuthn(
            config('app.name', 'Jeunesse Parle'),
            $rpId,
            ['none', 'packed', 'apple', 'android-key', 'tpm', 'fido-u2f'],
            true, // base64url JSON
        );
    }

    public function relyingPartyId(): string
    {
        $configured = config('jeunesse.biometrics.rp_id');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $host = parse_url((string) config('app.url'), PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'localhost';
    }

    /** Options de crÃ©ation de credential (contexte REGISTRATION). */
    public function registrationOptions(User $user): array
    {
        $webAuthn = $this->makeWebAuthn();

        $existing = WebAuthnCredential::query()
            ->where('user_id', $user->id)
            ->pluck('credential_id')
            ->map(fn (string $id) => $this->b64urlDecode($id))
            ->filter()
            ->values()
            ->all();

        $userId = pack('N', $user->id).Str::random(12);
        $args = $webAuthn->getCreateArgs(
            $userId,
            (string) ($user->email ?? $user->phone ?? $user->id),
            $user->name,
            60,
            true,
            true,
            false, // platform authenticator (Windows Hello)
            $existing,
        );

        $challenge = $webAuthn->getChallenge();
        $this->storeChallenge('reg:'.$user->id, $challenge);

        return [
            'options' => $args,
            'context' => BiometricContext::BiometricRegistration->value,
        ];
    }

    /** Persiste un nouveau credential WebAuthn pour l'utilisateur connectÃ©. */
    public function completeRegistration(User $user, object $clientData, Request $request): WebAuthnCredential
    {
        $webAuthn = $this->makeWebAuthn();
        $challenge = $this->pullChallenge('reg:'.$user->id);

        try {
            $data = $webAuthn->processCreate(
                $this->binaryFromClient($clientData->clientDataJSON ?? null),
                $this->binaryFromClient($clientData->attestationObject ?? null),
                $challenge,
                true, // requireUserVerification
                true, // requireUserPresent
                false, // do not fail without root CA in lab
            );
        } catch (WebAuthnException $e) {
            throw ValidationException::withMessages([
                'credential' => 'Enregistrement biometrique refusÃ© : '.$e->getMessage(),
            ]);
        }

        $credentialId = $this->b64urlEncode($data->credentialId);

        $credential = WebAuthnCredential::updateOrCreate(
            ['credential_id' => $credentialId],
            [
                'user_id' => $user->id,
                'member_id' => $user->member_id,
                'public_key' => $data->credentialPublicKey,
                'counter' => $data->signatureCounter ?? 0,
                'aaguid' => isset($data->AAGUID) ? bin2hex($data->AAGUID) : null,
                'attestation_format' => $data->attestationFormat ?? 'none',
                'device_name' => $request->input('device_name', 'Windows Hello / plateforme'),
                'transports' => $clientData->transports ?? ['internal'],
            ],
        );

        $this->audit->log(
            BiometricContext::BiometricRegistration->auditAction(),
            $user,
            'Credential biometrique enregistre',
            [],
            ['credential_id' => substr($credentialId, 0, 16), 'device' => $credential->device_name],
        );

        return $credential;
    }

    /** Options d'authentification / identification selon le contexte. */
    public function authenticationOptions(BiometricContext $context, ?User $actor = null): array
    {
        $webAuthn = $this->makeWebAuthn();

        $ids = [];
        if ($actor && ! $context->isDiscoverable()) {
            $ids = WebAuthnCredential::query()
                ->where('user_id', $actor->id)
                ->pluck('credential_id')
                ->map(fn (string $id) => $this->b64urlDecode($id))
                ->filter()
                ->values()
                ->all();
        }

        // DÃ©couvrable : allowCredentials vide â†’ Windows Hello propose les passkeys rÃ©sidents.
        $args = $webAuthn->getGetArgs(
            $ids,
            60,
            true,
            true,
            true,
            true,
            true,
            'required',
        );

        $challenge = $webAuthn->getChallenge();
        $key = 'auth:'.Str::uuid()->toString();
        $this->storeChallenge($key, $challenge, [
            'context' => $context->value,
            'actor_id' => $actor?->id,
        ]);

        return [
            'options' => $args,
            'challenge_key' => $key,
            'context' => $context->value,
        ];
    }

    /**
     * VÃ©rifie l'assertion WebAuthn puis exÃ©cute l'action du contexte.
     *
     * @return array<string, mixed>
     */
    public function completeAuthentication(
        BiometricContext $context,
        string $challengeKey,
        object $assertion,
        Request $request,
        ?Activity $activity = null,
    ): array {
        $meta = Cache::get($this->challengeCacheKey($challengeKey));
        if (! is_array($meta) || ! isset($meta['challenge'])) {
            throw ValidationException::withMessages([
                'credential' => 'DÃ©fi biometrique expirÃ©. RÃ©essayez.',
            ]);
        }

        Cache::forget($this->challengeCacheKey($challengeKey));

        $credentialId = $this->b64urlEncode($this->binaryFromClient($assertion->id ?? $assertion->rawId ?? null));
        $credential = WebAuthnCredential::query()
            ->with(['user.role.permissions', 'user.member', 'member.activeCard', 'member.structure', 'member.province'])
            ->where('credential_id', $credentialId)
            ->first();

        if (! $credential) {
            $this->audit->log($context->auditAction(), null, 'Credential biometrique inconnu', [], [
                'context' => $context->value,
                'result' => 'unknown_credential',
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Aucun membre correspondant n\'a Ã©tÃ© trouvÃ©.',
            ]);
        }

        $webAuthn = $this->makeWebAuthn();
        $challenge = $meta['challenge'] instanceof ByteBuffer
            ? $meta['challenge']
            : new ByteBuffer($this->b64urlDecode((string) $meta['challenge']));

        try {
            $webAuthn->processGet(
                $this->binaryFromClient($assertion->clientDataJSON ?? null),
                $this->binaryFromClient($assertion->authenticatorData ?? null),
                $this->binaryFromClient($assertion->signature ?? null),
                $credential->public_key,
                $challenge,
                $credential->counter,
                true,
                true,
            );
        } catch (WebAuthnException $e) {
            $this->audit->log($context->auditAction(), $credential->user, 'Ã‰chec vÃ©rification biometrique', [], [
                'context' => $context->value,
                'result' => 'failed',
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Identification Ã©chouÃ©e : '.$e->getMessage(),
            ]);
        }

        $credential->forceFill([
            'counter' => $webAuthn->getSignatureCounter() ?: $credential->counter,
            'last_used_at' => now(),
        ])->save();

        $user = $credential->user;
        $member = $credential->member ?? $user?->member;

        return match ($context) {
            BiometricContext::Login => $this->handleLogin($user, $request, $context),
            BiometricContext::MemberVerification => $this->handleVerification($member, $user, $context),
            // L'acteur = responsable connecté (pas le propriétaire du credential / membre pointé).
            BiometricContext::Attendance => $this->handleAttendance(
                $member,
                $request->user() instanceof User ? $request->user() : null,
                $activity,
                $request,
                $context,
            ),
            BiometricContext::BiometricRegistration, BiometricContext::SecurityConfirmation => [
                'ok' => true,
                'context' => $context->value,
                'message' => 'Identité confirmée.',
                'user_id' => $user?->id,
            ],
        };
    }

    public function listCredentials(User $user): array
    {
        return WebAuthnCredential::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (WebAuthnCredential $item) => [
                'id' => $item->id,
                'device_name' => $item->device_name,
                'created_at' => $item->created_at?->toIso8601String(),
                'last_used_at' => $item->last_used_at?->toIso8601String(),
            ])
            ->all();
    }

    public function revokeCredential(User $user, int $credentialId): void
    {
        $credential = WebAuthnCredential::query()
            ->where('user_id', $user->id)
            ->where('id', $credentialId)
            ->firstOrFail();

        $credential->delete();

        $this->audit->log('BIOMETRIC_REVOKED', $user, 'Credential biometrique revoque', [], [
            'credential_id' => $credentialId,
        ]);
    }

    private function handleLogin(?User $user, Request $request, BiometricContext $context): array
    {
        if (! $user) {
            throw ValidationException::withMessages([
                'credential' => 'Aucun compte associÃ© Ã  ce credential.',
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'credential' => 'Compte temporairement verrouillÃ©.',
            ]);
        }

        if (! $user->is_active) {
            $this->audit->log($context->auditAction(), $user, 'Connexion biometrique refusÃ©e â€” compte inactif', [], [
                'result' => 'inactive',
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Ce compte est dÃ©sactivÃ©.',
            ]);
        }

        $user->registerSuccessfulLogin($request->ip());
        $user->tokens()->where('name', $request->input('device_name', 'web'))->delete();
        $token = $user->createToken($request->input('device_name', 'web'))->plainTextToken;

        $this->audit->log($context->auditAction(), $user, "Connexion biométrique de {$user->name}", [], [
            'result' => 'success',
            'role' => $user->role?->slug,
        ]);

        $loaded = $user->load(['role.permissions', 'province', 'city', 'structure', 'member']);
        $request->setUserResolver(fn () => $loaded);

        return [
            'ok' => true,
            'context' => $context->value,
            'action' => 'LOGIN',
            'message' => 'Connexion réussie.',
            'token' => $token,
            'user' => (new UserResource($loaded))->resolve($request),
            'creates_session' => true,
        ];
    }

    private function handleVerification(?Member $member, ?User $user, BiometricContext $context): array
    {
        if (! $member) {
            throw ValidationException::withMessages([
                'credential' => 'Aucun membre associÃ© Ã  ce credential.',
            ]);
        }

        $this->audit->log($context->auditAction(), $member, "VÃ©rification biometrique {$member->member_code}", [], [
            'result' => 'success',
            'status' => $member->status->value,
            // Pas de crÃ©ation de session.
        ]);

        return [
            'ok' => true,
            'context' => $context->value,
            'action' => 'MEMBER_VERIFICATION',
            'message' => 'Membre identifiÃ©.',
            'creates_session' => false,
            'member' => [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'status' => $member->status->value,
                'status_label' => $member->status->label(),
                'photo_url' => $member->photo_path
                    ? route('media.member-photo', ['member' => $member->member_code])
                    : null,
                'structure' => $member->structure?->name,
                'province' => $member->province?->name,
                'card' => $member->activeCard ? [
                    'status' => $member->activeCard->status->value,
                    'status_label' => $member->activeCard->status->label(),
                    'card_number' => $member->activeCard->card_number,
                ] : null,
            ],
        ];
    }

    private function handleAttendance(
        ?Member $member,
        ?User $actor,
        ?Activity $activity,
        Request $request,
        BiometricContext $context,
    ): array {
        if (! $actor) {
            throw ValidationException::withMessages([
                'credential' => 'Un responsable connectÃ© est requis pour pointer une prÃ©sence.',
            ]);
        }

        if (! $member) {
            throw ValidationException::withMessages([
                'credential' => 'Aucun membre associÃ© Ã  ce credential.',
            ]);
        }

        if (! $activity) {
            throw ValidationException::withMessages([
                'activity_id' => 'ActivitÃ© manquante.',
            ]);
        }

        if ($member->status !== MemberStatus::Active) {
            throw ValidationException::withMessages([
                'credential' => 'Le membre n\'est pas actif â€” prÃ©sence refusÃ©e.',
            ]);
        }

        if (! $member->isVisibleTo($actor)) {
            throw ValidationException::withMessages([
                'credential' => 'Ce membre est hors de votre zone de responsabilitÃ©.',
            ]);
        }

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => AttendanceStatus::Present,
                'method' => 'fingerprint',
                'recorded_at' => now(),
                'recorded_by' => $actor->id,
                'note' => 'Pointage biometrique',
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => ['status' => 'confirmed', 'confirmed_at' => now()],
        ]);

        $this->audit->log($context->auditAction(), $attendance, "PrÃ©sence biometrique {$member->member_code}", [], [
            'activity_id' => $activity->id,
            'result' => 'success',
        ]);

        return [
            'ok' => true,
            'context' => $context->value,
            'action' => 'ATTENDANCE',
            'message' => 'PrÃ©sence enregistrÃ©e.',
            'creates_session' => false,
            'attendance' => [
                'id' => $attendance->id,
                'recorded_at' => $attendance->recorded_at?->toIso8601String(),
                'method' => 'fingerprint',
            ],
            'member' => [
                'id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'status' => $member->status->value,
                'status_label' => $member->status->label(),
            ],
        ];
    }

    private function storeChallenge(string $key, ByteBuffer $challenge, array $extra = []): void
    {
        Cache::put($this->challengeCacheKey($key), array_merge($extra, [
            'challenge' => $this->b64urlEncode($challenge->getBinaryString()),
        ]), now()->addMinutes(5));
    }

    private function pullChallenge(string $key): ByteBuffer
    {
        $meta = Cache::pull($this->challengeCacheKey($key));
        if (! is_array($meta) || empty($meta['challenge'])) {
            throw ValidationException::withMessages([
                'credential' => 'DÃ©fi biometrique expirÃ©. RÃ©essayez.',
            ]);
        }

        return new ByteBuffer($this->b64urlDecode((string) $meta['challenge']));
    }

    private function challengeCacheKey(string $key): string
    {
        return 'webauthn:challenge:'.$key;
    }

    private function binaryFromClient(mixed $value): string
    {
        if ($value instanceof ByteBuffer) {
            return $value->getBinaryString();
        }
        if (! is_string($value) || $value === '') {
            throw ValidationException::withMessages([
                'credential' => 'DonnÃ©es biometriques incomplÃ¨tes.',
            ]);
        }

        // base64url ou base64 standard
        $decoded = $this->b64urlDecode($value);
        if ($decoded !== '') {
            return $decoded;
        }

        $std = base64_decode($value, true);

        return $std === false ? $value : $std;
    }

    private function b64urlEncode(string $binary): string
    {
        return rtrim(strtr(base64_encode($binary), '+/', '-_'), '=');
    }

    private function b64urlDecode(string $value): string
    {
        $padded = strtr($value, '-_', '+/');
        $pad = strlen($padded) % 4;
        if ($pad > 0) {
            $padded .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode($padded, true);

        return $decoded === false ? '' : $decoded;
    }
}
