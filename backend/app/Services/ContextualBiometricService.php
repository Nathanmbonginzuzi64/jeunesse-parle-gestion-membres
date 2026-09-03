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
 * Infrastructure biométrique unique (WebAuthn / Windows Hello).
 * Le contexte détermine l'action après identification du credential.
 */
class ContextualBiometricService
{
    private const CHALLENGE_TTL_MINUTES = 30;

    private const PENDING_ENROLLMENT_TTL_MINUTES = 30;

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
        if (is_string($configured) && $configured !== '' && ! in_array($configured, ['localhost', '127.0.0.1'], true)) {
            return $configured;
        }

        $request = request();
        if ($request instanceof Request) {
            $origin = $request->headers->get('Origin') ?: $request->headers->get('Referer');
            if (is_string($origin) && $origin !== '') {
                $host = parse_url($origin, PHP_URL_HOST);
                if (is_string($host) && $host !== '') {
                    return $host;
                }
            }
        }

        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        $host = parse_url((string) config('app.url'), PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : 'localhost';
    }

    /** Options de création de credential (contexte REGISTRATION). */
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

    /** Persiste un nouveau credential WebAuthn pour l'utilisateur connecté. */
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
                'credential' => 'Enregistrement biométrique refusé : '.$e->getMessage(),
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
            'Credential biométrique enregistré',
            [],
            ['credential_id' => substr($credentialId, 0, 16), 'device' => $credential->device_name],
        );

        return $credential;
    }

    /**
     * Options WebAuthn lors de la création d'un membre (formulaire d'adhésion ou ajout admin).
     * Le credential est finalisé après création du dossier membre.
     */
    public function memberEnrollmentOptions(string $enrollmentKey, string $userName, string $displayName): array
    {
        $webAuthn = $this->makeWebAuthn();

        $userId = Str::random(16);
        $args = $webAuthn->getCreateArgs(
            $userId,
            $userName,
            $displayName,
            60,
            true,
            true,
            false,
            [],
        );

        $challenge = $webAuthn->getChallenge();
        $this->storeChallenge('enroll:'.$enrollmentKey, $challenge, [
            'context' => BiometricContext::MemberEnrollment->value,
        ]);

        return [
            'options' => $args,
            'enrollment_key' => $enrollmentKey,
            'context' => BiometricContext::MemberEnrollment->value,
        ];
    }

    /**
     * Vérifie l'empreinte WebAuthn juste après Windows Hello et la met en attente
     * jusqu'à la création du dossier membre (évite l'expiration du défi).
     */
    public function finalizeMemberEnrollment(object $clientData): void
    {
        $enrollmentKey = (string) ($clientData->enrollment_key ?? '');
        if ($enrollmentKey === '') {
            throw ValidationException::withMessages([
                'webauthn_enrollment' => 'Clé d\'enregistrement biométrique manquante.',
            ]);
        }

        $verified = $this->verifyEnrollmentAttestation($clientData, 'webauthn_enrollment');

        Cache::put(
            $this->pendingEnrollmentCacheKey($enrollmentKey),
            array_merge($verified, [
                'device_name' => $clientData->device_name ?? 'Windows Hello / plateforme',
                'transports' => $clientData->transports ?? ['internal'],
            ]),
            now()->addMinutes(self::PENDING_ENROLLMENT_TTL_MINUTES),
        );
    }

    public function hasPendingEnrollment(string $enrollmentKey): bool
    {
        return Cache::has($this->pendingEnrollmentCacheKey($enrollmentKey));
    }

    /** Lie un credential WebAuthn à un membre (et à son compte utilisateur si présent). */
    public function completeMemberEnrollment(
        ?User $user,
        Member $member,
        object $clientData,
        Request $request,
    ): WebAuthnCredential {
        $credential = $this->persistEnrollmentCredential(
            $clientData,
            $user?->id,
            $member->id,
            fn () => WebAuthnCredential::query()->where('member_id', $member->id)->delete(),
        );

        $this->audit->log(
            BiometricContext::MemberEnrollment->auditAction(),
            $member,
            "Credential biométrique enregistré pour {$member->member_code}",
            [],
            ['credential_id' => substr($credential->credential_id, 0, 16), 'device' => $credential->device_name],
        );

        return $credential;
    }

    public function attachPendingMemberEnrollment(
        string $enrollmentKey,
        ?User $user,
        Member $member,
    ): WebAuthnCredential {
        $pending = Cache::pull($this->pendingEnrollmentCacheKey($enrollmentKey));

        if (! is_array($pending)) {
            throw ValidationException::withMessages([
                'webauthn_enrollment' => 'L\'enregistrement biométrique a expiré. Reconfigurez Windows Hello puis réessayez.',
            ]);
        }

        WebAuthnCredential::query()->where('member_id', $member->id)->delete();

        $credential = WebAuthnCredential::updateOrCreate(
            ['credential_id' => $pending['credential_id']],
            [
                'user_id' => $user?->id,
                'member_id' => $member->id,
                'public_key' => $pending['public_key'],
                'counter' => $pending['counter'] ?? 0,
                'aaguid' => $pending['aaguid'] ?? null,
                'attestation_format' => $pending['attestation_format'] ?? 'none',
                'device_name' => $pending['device_name'] ?? 'Windows Hello / plateforme',
                'transports' => $pending['transports'] ?? ['internal'],
            ],
        );

        $this->audit->log(
            BiometricContext::MemberEnrollment->auditAction(),
            $member,
            "Credential biométrique enregistré pour {$member->member_code}",
            [],
            ['credential_id' => substr($credential->credential_id, 0, 16), 'device' => $credential->device_name],
        );

        return $credential;
    }

    /** Lie un credential WebAuthn à un compte utilisateur (création / édition admin). */
    public function completeUserEnrollment(User $user, object $clientData, Request $request): WebAuthnCredential
    {
        $credential = $this->persistEnrollmentCredential(
            $clientData,
            $user->id,
            $user->member_id,
            fn () => WebAuthnCredential::query()->where('user_id', $user->id)->delete(),
        );

        $this->audit->log(
            BiometricContext::UserEnrollment->auditAction(),
            $user,
            "Credential biométrique enregistré pour {$user->email}",
            [],
            ['credential_id' => substr($credential->credential_id, 0, 16)],
        );

        return $credential;
    }

    /**
     * @param  callable(): void|null  $beforePersist
     */
    private function persistEnrollmentCredential(
        object $clientData,
        ?int $userId,
        ?int $memberId,
        ?callable $beforePersist = null,
    ): WebAuthnCredential {
        $verified = $this->verifyEnrollmentAttestation($clientData, 'webauthn_enrollment');

        if ($beforePersist) {
            $beforePersist();
        }

        return WebAuthnCredential::updateOrCreate(
            ['credential_id' => $verified['credential_id']],
            [
                'user_id' => $userId,
                'member_id' => $memberId,
                'public_key' => $verified['public_key'],
                'counter' => $verified['counter'] ?? 0,
                'aaguid' => $verified['aaguid'] ?? null,
                'attestation_format' => $verified['attestation_format'] ?? 'none',
                'device_name' => $clientData->device_name ?? 'Windows Hello / plateforme',
                'transports' => $clientData->transports ?? ['internal'],
            ],
        );
    }

    /**
     * @return array{credential_id: string, public_key: string, counter: int, aaguid: ?string, attestation_format: string}
     */
    private function verifyEnrollmentAttestation(object $clientData, string $errorField = 'webauthn_enrollment'): array
    {
        $enrollmentKey = (string) ($clientData->enrollment_key ?? '');
        if ($enrollmentKey === '') {
            throw ValidationException::withMessages([
                $errorField => 'Clé d\'enregistrement biométrique manquante.',
            ]);
        }

        $webAuthn = $this->makeWebAuthn();
        $challenge = $this->peekChallenge('enroll:'.$enrollmentKey, $errorField);

        try {
            $data = $webAuthn->processCreate(
                $this->binaryFromClient($clientData->clientDataJSON ?? null),
                $this->binaryFromClient($clientData->attestationObject ?? null),
                $challenge,
                true,
                true,
                false,
            );
        } catch (WebAuthnException $e) {
            throw ValidationException::withMessages([
                $errorField => 'Enregistrement biométrique refusé : '.$e->getMessage(),
            ]);
        }

        $this->forgetChallenge('enroll:'.$enrollmentKey);

        return [
            'credential_id' => $this->b64urlEncode($data->credentialId),
            'public_key' => $data->credentialPublicKey,
            'counter' => $data->signatureCounter ?? 0,
            'aaguid' => isset($data->AAGUID) ? bin2hex($data->AAGUID) : null,
            'attestation_format' => $data->attestationFormat ?? 'none',
        ];
    }

    public function memberHasCredential(Member $member): bool
    {
        return WebAuthnCredential::query()->where('member_id', $member->id)->exists();
    }

    public function revokeUserCredentials(User $user): void
    {
        $deleted = WebAuthnCredential::query()->where('user_id', $user->id)->delete();

        if ($deleted > 0) {
            $this->audit->log('BIOMETRIC_REVOKED', $user, 'Credentials biométriques révoqués', [], [
                'count' => $deleted,
            ]);
        }
    }

    public function userHasCredential(User $user): bool
    {
        return WebAuthnCredential::query()->where('user_id', $user->id)->exists();
    }

    /** Options d'authentification / identification selon le contexte. */
    public function authenticationOptions(BiometricContext $context, ?User $actor = null): array
    {
        $webAuthn = $this->makeWebAuthn();

        $ids = [];
        if ($actor && ! $context->isDiscoverable()) {
            $ids = WebAuthnCredential::query()
                ->where(function ($query) use ($actor) {
                    $query->where('user_id', $actor->id);
                    if ($actor->member_id) {
                        $query->orWhere('member_id', $actor->member_id);
                    }
                })
                ->pluck('credential_id')
                ->map(fn (string $id) => $this->b64urlDecode($id))
                ->filter()
                ->values()
                ->all();
        }

        // Découvrable : pas de allowCredentials → Windows Hello propose les passkeys résidents.
        $userVerification = $context->isDiscoverable() ? 'preferred' : 'required';
        $args = $webAuthn->getGetArgs(
            $ids,
            60,
            true,
            true,
            true,
            true,
            true,
            $userVerification,
        );

        if ($context->isDiscoverable()) {
            $args = $this->normalizeDiscoverableGetArgs($args);
        }

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
     * Vérifie l'assertion WebAuthn puis exécute l'action du contexte.
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
                'credential' => 'Défi biométrique expiré. Réessayez.',
            ]);
        }

        Cache::forget($this->challengeCacheKey($challengeKey));

        $credentialId = $this->b64urlEncode($this->binaryFromClient($assertion->id ?? $assertion->rawId ?? null));
        $credential = WebAuthnCredential::query()
            ->with([
                'user.role.permissions',
                'user.member',
                'member.activeCard',
                'member.structure',
                'member.province',
                'member.city',
            ])
            ->where('credential_id', $credentialId)
            ->first();

        if (! $credential) {
            $this->audit->log($context->auditAction(), null, 'Credential biométrique inconnu', [], [
                'context' => $context->value,
                'result' => 'unknown_credential',
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Aucun membre correspondant n\'a été trouvé.',
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
            $this->audit->log($context->auditAction(), $credential->user, 'Échec vérification biométrique', [], [
                'context' => $context->value,
                'result' => 'failed',
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Identification échouée : '.$e->getMessage(),
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
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->member_id) {
                    $query->orWhere('member_id', $user->member_id);
                }
            })
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

        $this->audit->log('BIOMETRIC_REVOKED', $user, 'Credential biométrique révoqué', [], [
            'credential_id' => $credentialId,
        ]);
    }

    private function handleLogin(?User $user, Request $request, BiometricContext $context): array
    {
        if (! $user) {
            throw ValidationException::withMessages([
                'credential' => 'Aucun compte associé à ce credential.',
            ]);
        }

        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'credential' => 'Compte temporairement verrouillé.',
            ]);
        }

        if (! $user->is_active) {
            $this->audit->log($context->auditAction(), $user, 'Connexion biométrique refusée — compte inactif', [], [
                'result' => 'inactive',
            ]);

            throw ValidationException::withMessages([
                'credential' => 'Ce compte est désactivé.',
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
                'credential' => 'Aucun membre associé à ce credential.',
            ]);
        }

        $this->audit->log($context->auditAction(), $member, "Vérification biométrique {$member->member_code}", [], [
            'result' => 'success',
            'status' => $member->status->value,
            // Pas de création de session.
        ]);

        return [
            'ok' => true,
            'context' => $context->value,
            'action' => 'MEMBER_VERIFICATION',
            'message' => 'Membre identifié.',
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
                'city' => $member->city?->name,
                'position' => $member->position,
                'phone' => $member->phone,
                'card' => $member->activeCard ? [
                    'status' => $member->activeCard->status->value,
                    'status_label' => $member->activeCard->status->label(),
                    'card_number' => $member->activeCard->card_number,
                    'issued_at' => $member->activeCard->issued_at?->toDateString(),
                    'expires_at' => $member->activeCard->expires_at?->toDateString(),
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
                'credential' => 'Un responsable connecté est requis pour pointer une présence.',
            ]);
        }

        if (! $member) {
            throw ValidationException::withMessages([
                'credential' => 'Aucun membre associé à ce credential.',
            ]);
        }

        if (! $activity) {
            throw ValidationException::withMessages([
                'activity_id' => 'Activité manquante.',
            ]);
        }

        if ($member->status !== MemberStatus::Active) {
            throw ValidationException::withMessages([
                'credential' => 'Le membre n\'est pas actif — présence refusée.',
            ]);
        }

        if (! $member->isVisibleTo($actor)) {
            throw ValidationException::withMessages([
                'credential' => 'Ce membre est hors de votre zone de responsabilité.',
            ]);
        }

        $attendance = Attendance::updateOrCreate(
            ['activity_id' => $activity->id, 'member_id' => $member->id],
            [
                'status' => AttendanceStatus::Present,
                'method' => 'fingerprint',
                'recorded_at' => now(),
                'recorded_by' => $actor->id,
                'note' => 'Pointage biométrique',
            ],
        );

        $activity->members()->syncWithoutDetaching([
            $member->id => ['status' => 'confirmed', 'confirmed_at' => now()],
        ]);

        $this->audit->log($context->auditAction(), $attendance, "Présence biométrique {$member->member_code}", [], [
            'activity_id' => $activity->id,
            'result' => 'success',
        ]);

        return [
            'ok' => true,
            'context' => $context->value,
            'action' => 'ATTENDANCE',
            'message' => 'Présence enregistrée.',
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
        ]), now()->addMinutes(self::CHALLENGE_TTL_MINUTES));
    }

    private function peekChallenge(string $key, string $errorField = 'credential'): ByteBuffer
    {
        $meta = Cache::get($this->challengeCacheKey($key));
        if (! is_array($meta) || empty($meta['challenge'])) {
            throw ValidationException::withMessages([
                $errorField => 'Défi biométrique expiré. Reconfigurez Windows Hello puis réessayez.',
            ]);
        }

        return new ByteBuffer($this->b64urlDecode((string) $meta['challenge']));
    }

    private function pullChallenge(string $key, string $errorField = 'credential'): ByteBuffer
    {
        $challenge = $this->peekChallenge($key, $errorField);
        $this->forgetChallenge($key);

        return $challenge;
    }

    private function forgetChallenge(string $key): void
    {
        Cache::forget($this->challengeCacheKey($key));
    }

    private function challengeCacheKey(string $key): string
    {
        return 'webauthn:challenge:'.$key;
    }

    private function pendingEnrollmentCacheKey(string $enrollmentKey): string
    {
        return 'webauthn:pending-enrollment:'.$enrollmentKey;
    }

    /**
     * Windows Hello refuse parfois une liste allowCredentials vide.
     * Pour l'identification découvrable, on retire ce champ et on assouplit la vérification.
     */
    private function normalizeDiscoverableGetArgs(mixed $args): mixed
    {
        if (is_object($args)) {
            $args = json_decode(json_encode($args), true) ?? [];
        }

        if (! is_array($args)) {
            return $args;
        }

        if (array_key_exists('allowCredentials', $args) && $args['allowCredentials'] === []) {
            unset($args['allowCredentials']);
        }

        if (($args['userVerification'] ?? null) === 'required') {
            $args['userVerification'] = 'preferred';
        }

        return $args;
    }

    private function binaryFromClient(mixed $value): string
    {
        if ($value instanceof ByteBuffer) {
            return $value->getBinaryString();
        }
        if (! is_string($value) || $value === '') {
            throw ValidationException::withMessages([
                'credential' => 'Données biométriques incomplètes.',
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
