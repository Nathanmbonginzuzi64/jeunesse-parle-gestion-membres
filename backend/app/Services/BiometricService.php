<?php

namespace App\Services;

use App\Models\BiometricTemplate;
use App\Models\Member;
use App\Models\User;
use App\Models\WebAuthnCredential;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Enrollment et matching d'empreintes.
 *
 * Le client (lecteur HID / simulation) capture l'échantillon et envoie un
 * `template_hash`. Le serveur stocke une empreinte HMAC et décide seul du match.
 */
class BiometricService
{
    public const REQUIRED_SLOTS = [
        'left_auriculaire',
        'left_index',
        'left_majeur',
        'right_auriculaire',
        'right_index',
        'right_majeur',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function enabled(): bool
    {
        return (bool) config('jeunesse.biometrics.enabled', true);
    }

    public function labMode(): bool
    {
        return (bool) config('jeunesse.biometrics.lab_mode', false);
    }

    /** @param  array<int, array{slot?: string, position?: string, template_hash: string, captured_at?: string|null}>  $fingerprints */
    public function enrollForMember(Member $member, array $fingerprints, ?User $author = null, bool $consent = true): void
    {
        $this->assertEnabled();
        $this->persistOwner('member_id', $member->id, $fingerprints, $author, $consent, $member);
    }

    /** @param  array<int, array{slot?: string, position?: string, template_hash: string, captured_at?: string|null}>  $fingerprints */
    public function enrollForUser(User $user, array $fingerprints, ?User $author = null, bool $consent = true): void
    {
        $this->assertEnabled();
        $this->persistOwner('user_id', $user->id, $fingerprints, $author, $consent, $user);
    }

    public function countForMember(Member $member): int
    {
        return BiometricTemplate::query()
            ->where('member_id', $member->id)
            ->where('modality', 'fingerprint')
            ->where('status', 'enrolled')
            ->count();
    }

    public function countForUser(User $user): int
    {
        return BiometricTemplate::query()
            ->where('user_id', $user->id)
            ->where('modality', 'fingerprint')
            ->where('status', 'enrolled')
            ->count();
    }

    public function userIsEnrolled(User $user): bool
    {
        if (WebAuthnCredential::query()->where('user_id', $user->id)->exists()) {
            return true;
        }

        return $this->countForUser($user) >= count(self::REQUIRED_SLOTS);
    }

    /**
     * @return array{matched: BiometricTemplate|null, lab: bool}
     */
    public function matchMember(Member $member, ?string $templateHash, string $format = 'hardware'): array
    {
        $this->assertEnabled();

        $templates = BiometricTemplate::query()
            ->where('member_id', $member->id)
            ->where('modality', 'fingerprint')
            ->where('status', 'enrolled')
            ->get();

        if ($templates->isEmpty()) {
            throw ValidationException::withMessages([
                'template_hash' => 'Aucune empreinte enregistrée pour ce membre.',
            ]);
        }

        return $this->resolveMatch($templates, $templateHash, $format);
    }

    /**
     * Identifie un membre parmi une liste à partir d'un échantillon d'empreinte.
     *
     * @return array{member: Member, matched: BiometricTemplate, lab: bool}|null
     */
    public function identifyMemberAmong(array $memberIds, ?string $templateHash, string $format = 'hardware'): ?array
    {
        $this->assertEnabled();

        if ($memberIds === []) {
            return null;
        }

        $templates = BiometricTemplate::query()
            ->whereIn('member_id', $memberIds)
            ->where('modality', 'fingerprint')
            ->where('status', 'enrolled')
            ->with('member')
            ->get();

        if ($templates->isEmpty()) {
            return null;
        }

        if (filled($templateHash)) {
            $sealed = $this->seal($templateHash);
            $matched = $templates->first(fn (BiometricTemplate $item) => hash_equals(
                (string) $item->template_reference,
                $sealed,
            ));

            if ($matched?->member) {
                return ['member' => $matched->member, 'matched' => $matched, 'lab' => false];
            }
        }

        if ($format === 'simulation' && $this->labMode()) {
            $first = $templates->first();
            if ($first?->member) {
                return ['member' => $first->member, 'matched' => $first, 'lab' => true];
            }
        }

        return null;
    }

    /**
     * @return array{matched: BiometricTemplate|null, lab: bool}
     */
    public function matchUser(User $user, ?string $templateHash, string $format = 'hardware'): array
    {
        $this->assertEnabled();

        $templates = BiometricTemplate::query()
            ->where('user_id', $user->id)
            ->where('modality', 'fingerprint')
            ->where('status', 'enrolled')
            ->get();

        if ($templates->isEmpty()) {
            throw ValidationException::withMessages([
                'template_hash' => 'Aucune empreinte enregistrée pour ce compte.',
            ]);
        }

        return $this->resolveMatch($templates, $templateHash, $format);
    }

    public function seal(string $templateHash): string
    {
        return hash_hmac('sha256', $templateHash, (string) config('app.key'));
    }

    /**
     * @param  array<int, array{slot?: string, position?: string, template_hash: string, captured_at?: string|null}>  $fingerprints
     */
    private function persistOwner(
        string $ownerColumn,
        int $ownerId,
        array $fingerprints,
        ?User $author,
        bool $consent,
        Member|User $subject,
    ): void {
        $normalized = $this->normalizeFingerprints($fingerprints);

        if (count($normalized) < count(self::REQUIRED_SLOTS)) {
            throw ValidationException::withMessages([
                'fingerprints' => 'Les 6 empreintes (auriculaire, index, majeur — deux mains) sont requises.',
            ]);
        }

        DB::transaction(function () use ($ownerColumn, $ownerId, $normalized, $author, $consent, $subject) {
            BiometricTemplate::query()
                ->where($ownerColumn, $ownerId)
                ->where('modality', 'fingerprint')
                ->delete();

            foreach ($normalized as $item) {
                BiometricTemplate::create([
                    $ownerColumn => $ownerId,
                    'modality' => 'fingerprint',
                    'position' => $item['position'],
                    'provider' => config('jeunesse.biometrics.provider', 'local-hash'),
                    'algorithm' => 'hmac-sha256',
                    'template_reference' => $this->seal($item['template_hash']),
                    'quality_score' => 90,
                    'status' => 'enrolled',
                    'captured_at' => $item['captured_at'] ?? now(),
                    'consent_given_at' => $consent ? now() : null,
                    'consent_reference' => $consent ? 'explicit-ui' : null,
                    'enrolled_by' => $author?->id,
                ]);
            }

            $label = $subject instanceof Member
                ? "Enrollment biométrique membre {$subject->member_code}"
                : "Enrollment biométrique compte {$subject->email}";

            $this->audit->log('biometric.enrolled', $subject, $label);
        });
    }

    /**
     * @param  Collection<int, BiometricTemplate>  $templates
     * @return array{matched: BiometricTemplate|null, lab: bool}
     */
    private function resolveMatch(Collection $templates, ?string $templateHash, string $format): array
    {
        if (filled($templateHash)) {
            $sealed = $this->seal($templateHash);
            $matched = $templates->first(fn (BiometricTemplate $item) => hash_equals(
                (string) $item->template_reference,
                $sealed,
            ));

            if ($matched) {
                return ['matched' => $matched, 'lab' => false];
            }

            // Mode labo : simulation sans lecteur — accepte si le compte est enrôlé.
            if ($format === 'simulation' && $this->labMode()) {
                return ['matched' => $templates->first(), 'lab' => true];
            }

            throw ValidationException::withMessages([
                'template_hash' => 'Empreinte non reconnue.',
            ]);
        }

        if ($format === 'simulation' && $this->labMode()) {
            return ['matched' => $templates->first(), 'lab' => true];
        }

        throw ValidationException::withMessages([
            'template_hash' => 'Échantillon biométrique manquant.',
        ]);
    }

    /**
     * @param  array<int, array{slot?: string, position?: string, template_hash: string, captured_at?: string|null}>  $fingerprints
     * @return array<int, array{position: string, template_hash: string, captured_at: mixed}>
     */
    private function normalizeFingerprints(array $fingerprints): array
    {
        $byPosition = [];

        foreach ($fingerprints as $item) {
            $position = $item['slot'] ?? $item['position'] ?? null;
            $hash = $item['template_hash'] ?? null;

            if (! is_string($position) || ! in_array($position, self::REQUIRED_SLOTS, true)) {
                continue;
            }
            if (! is_string($hash) || strlen($hash) < 8) {
                continue;
            }

            $byPosition[$position] = [
                'position' => $position,
                'template_hash' => $hash,
                'captured_at' => $item['captured_at'] ?? now(),
            ];
        }

        return array_values($byPosition);
    }

    private function assertEnabled(): void
    {
        if (! $this->enabled()) {
            throw ValidationException::withMessages([
                'biometrics' => 'La biométrie est désactivée sur ce serveur.',
            ]);
        }
    }
}
