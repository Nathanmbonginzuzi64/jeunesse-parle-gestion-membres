<?php

namespace App\Services;

use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use App\Models\MemberStatusHistory;
use App\Models\Role;
use App\Models\User;
use App\Models\WebAuthnCredential;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MemberService
{
    public function __construct(
        private readonly IdentifierGenerator $identifiers,
        private readonly PhotoStorageService $photos,
        private readonly CardService $cards,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
        private readonly BiometricService $biometrics,
        private readonly ContextualBiometricService $contextualBiometrics,
    ) {}

    /**
     * Transitions autorisées du cycle de vie d'un dossier membre.
     * Toute autre combinaison est refusée côté serveur.
     */
    private const TRANSITIONS = [
        'pending' => ['active', 'inactive', 'archived'],
        'active' => ['inactive', 'suspended', 'archived'],
        'inactive' => ['active', 'suspended', 'archived'],
        'suspended' => ['active', 'inactive', 'archived'],
        'archived' => ['active'],
    ];

    public function create(array $data, ?User $author, ?UploadedFile $photo = null): Member
    {
        return DB::transaction(function () use ($data, $author, $photo) {
            $fingerprints = $data['fingerprints'] ?? null;
            $webauthnEnrollment = $data['webauthn_enrollment'] ?? null;
            $portalPassword = $data['password'] ?? null;
            unset(
                $data['fingerprints'],
                $data['fingerprint_enrollment'],
                $data['webauthn_enrollment'],
                $data['password'],
                $data['password_confirmation'],
            );

            $data['member_code'] = $this->identifiers->memberCode();
            $data['status'] = $data['status'] ?? MemberStatus::Pending->value;
            $data['status_changed_at'] = now();
            $data['registered_by'] = $author?->id;
            $data['joined_at'] = $data['joined_at'] ?? now()->toDateString();

            if (! empty($data['consent_given'])) {
                $data['consent_given_at'] = now();
            }

            $data = $this->fillTerritoryFromStructure($data);

            $member = Member::create($data);

            if ($photo) {
                $member->update(['photo_path' => $this->photos->store($photo, $member->member_code)]);
            }

            MemberStatusHistory::create([
                'member_id' => $member->id,
                'from_status' => null,
                'to_status' => $member->status->value,
                'reason' => 'Inscription',
                'changed_by' => $author?->id,
            ]);

            if (is_array($fingerprints) && $fingerprints !== []) {
                $this->biometrics->enrollForMember($member, $fingerprints, $author, (bool) ($data['consent_given'] ?? true));
            }

            if (is_array($webauthnEnrollment) && $webauthnEnrollment !== []) {
                $this->attachWebAuthnEnrollment($member, $webauthnEnrollment);
            }

            $this->ensureMemberPortalUser($member, $portalPassword, $author === null);

            $this->audit->log('member.created', $member, "Inscription du membre {$member->member_code}");

            $member = $member->fresh();
            $this->notifications->memberWelcome($member);
            $this->notifications->adminNewMember($member, $author);

            if ($member->status === MemberStatus::Active) {
                $this->cards->issue($member, $author, 'Émission initiale');
            }

            return $member->fresh();
        });
    }

    public function update(Member $member, array $data, ?User $author, ?UploadedFile $photo = null): Member
    {
        return DB::transaction(function () use ($member, $data, $author, $photo) {
            $before = $member->getAttributes();
            $fingerprints = $data['fingerprints'] ?? null;
            $webauthnEnrollment = $data['webauthn_enrollment'] ?? null;
            $portalPassword = $data['password'] ?? null;
            unset(
                $data['fingerprints'],
                $data['fingerprint_enrollment'],
                $data['webauthn_enrollment'],
                $data['password'],
                $data['password_confirmation'],
                $data['status'],
                $data['member_code'],
                $data['user_id'],
            );
            $data = $this->fillTerritoryFromStructure($data, $member);

            $member->fill($data);

            if ($photo) {
                $member->photo_path = $this->photos->store($photo, $member->member_code, $member->photo_path);
            }

            $member->save();

            if (is_array($fingerprints) && $fingerprints !== []) {
                $this->biometrics->enrollForMember($member, $fingerprints, $author, true);
            }

            if (is_array($webauthnEnrollment) && $webauthnEnrollment !== []) {
                $this->attachWebAuthnEnrollment($member, $webauthnEnrollment);
            }

            if (is_string($portalPassword) && $portalPassword !== '') {
                $this->ensureMemberPortalUser($member, $portalPassword, false);
            } elseif ($member->user_id) {
                $this->syncMemberPortalUser($member);
            }

            $this->audit->logChanges('member.updated', $member, $before, "Modification du membre {$member->member_code}");

            return $member->fresh();
        });
    }

    /**
     * Valide un dossier en attente : le membre devient actif et sa carte est émise.
     */
    public function validate(Member $member, User $author): Member
    {
        if ($member->status === MemberStatus::Active) {
            throw ValidationException::withMessages([
                'status' => 'Ce membre est déjà actif.',
            ]);
        }

        return DB::transaction(function () use ($member, $author) {
            $this->changeStatus($member, MemberStatus::Active, 'Dossier validé', $author, notify: false);

            $member->forceFill([
                'validated_at' => now(),
                'validated_by' => $author->id,
            ])->save();

            $this->cards->issue($member, $author, 'Émission après validation');
            $this->notifications->memberValidated($member, $author);
            $this->audit->log('member.validated', $member, "Validation du membre {$member->member_code}");

            return $member->fresh(['activeCard.activeQrToken']);
        });
    }

    public function changeStatus(
        Member $member,
        MemberStatus $status,
        ?string $reason,
        ?User $author,
        bool $notify = true,
    ): Member {
        $from = $member->status;

        if ($from === $status) {
            throw ValidationException::withMessages([
                'status' => 'Le membre possède déjà ce statut.',
            ]);
        }

        if (! in_array($status->value, self::TRANSITIONS[$from->value] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "Transition impossible : « {$from->label()} » vers « {$status->label()} ».",
            ]);
        }

        return DB::transaction(function () use ($member, $status, $reason, $author, $from, $notify) {
            $member->forceFill([
                'status' => $status->value,
                'status_reason' => $reason,
                'status_changed_at' => now(),
            ])->save();

            MemberStatusHistory::create([
                'member_id' => $member->id,
                'from_status' => $from->value,
                'to_status' => $status->value,
                'reason' => $reason,
                'changed_by' => $author?->id,
            ]);

            // Une carte ne peut survivre à la perte du statut actif.
            if (! $status->allowsCard()) {
                foreach ($member->cards()->where('status', 'active')->get() as $card) {
                    $this->cards->revoke($card, \App\Enums\CardStatus::Suspended, "Statut du membre : {$status->label()}");
                }
            }

            $this->audit->log('member.status-changed', $member, "{$from->label()} → {$status->label()}".($reason ? " ({$reason})" : ''));

            if ($notify) {
                $this->notifications->memberStatusChanged($member, $status->label(), $reason);
            }

            return $member->fresh();
        });
    }

    /**
     * Complète les colonnes territoriales dénormalisées à partir de la structure,
     * afin que le cloisonnement et les agrégats restent exacts et indexables.
     */
    private function fillTerritoryFromStructure(array $data, ?Member $member = null): array
    {
        $structureId = $data['structure_id'] ?? $member?->structure_id;

        if (! $structureId) {
            return $data;
        }

        $structure = \App\Models\Structure::find($structureId);

        if (! $structure) {
            return $data;
        }

        $data['province_id'] = $data['province_id'] ?? $structure->province_id;
        $data['city_id'] = $data['city_id'] ?? $structure->city_id;
        $data['commune_id'] = $data['commune_id'] ?? $structure->commune_id;
        $data['zone_id'] = $data['zone_id'] ?? $structure->zone_id;

        return $data;
    }

    /** @param  array<string, mixed>  $webauthnEnrollment */
    private function attachWebAuthnEnrollment(Member $member, array $webauthnEnrollment): void
    {
        $linkedUser = $member->user_id ? User::find($member->user_id) : null;
        $enrollmentKey = (string) ($webauthnEnrollment['enrollment_key'] ?? '');

        if (! empty($webauthnEnrollment['clientDataJSON'])) {
            $this->contextualBiometrics->completeMemberEnrollment(
                $linkedUser,
                $member,
                (object) $webauthnEnrollment,
                request(),
            );

            return;
        }

        if ($enrollmentKey !== '') {
            $this->contextualBiometrics->attachPendingMemberEnrollment(
                $enrollmentKey,
                $linkedUser,
                $member,
            );
        }
    }

    private function ensureMemberPortalUser(Member $member, ?string $password, bool $selfRegistration = false): void
    {
        if ($member->user_id) {
            $this->syncMemberPortalUser($member, $password);

            return;
        }

        if (! is_string($password) || $password === '') {
            throw ValidationException::withMessages([
                'password' => 'Le mot de passe portail est obligatoire pour activer l\'accès membre.',
            ]);
        }

        $this->createMemberPortalUser($member, $password, $selfRegistration);
    }

    private function syncMemberPortalUser(Member $member, ?string $password = null): void
    {
        if (! $member->user_id) {
            return;
        }

        $user = User::query()->find($member->user_id);

        if (! $user) {
            return;
        }

        $payload = [
            'name' => trim($member->first_name.' '.$member->last_name),
            'email' => $member->email,
            'phone' => $member->phone,
            'province_id' => $member->province_id,
            'city_id' => $member->city_id,
            'commune_id' => $member->commune_id,
            'structure_id' => $member->structure_id,
            'member_id' => $member->id,
            'is_active' => true,
        ];

        if (is_string($password) && $password !== '') {
            $payload['password'] = $password;
            $payload['must_change_password'] = true;
        }

        $user->forceFill($payload)->save();
    }

    private function createMemberPortalUser(Member $member, string $password, bool $selfRegistration = false): User
    {
        $memberRole = Role::query()->where('slug', RoleSlug::Membre->value)->firstOrFail();

        $user = User::create([
            'name' => trim($member->first_name.' '.$member->last_name),
            'email' => $member->email,
            'phone' => $member->phone,
            'password' => $password,
            'role_id' => $memberRole->id,
            'province_id' => $member->province_id,
            'city_id' => $member->city_id,
            'commune_id' => $member->commune_id,
            'structure_id' => $member->structure_id,
            'member_id' => $member->id,
            'is_active' => true,
            'must_change_password' => ! $selfRegistration,
            'must_confirm_biometric' => ! $selfRegistration,
        ]);

        $member->forceFill(['user_id' => $user->id])->save();

        WebAuthnCredential::query()
            ->where('member_id', $member->id)
            ->update(['user_id' => $user->id]);

        return $user;
    }

    public function provisionPortalUser(Member $member, string $password, bool $selfRegistration = false): User
    {
        if ($member->user_id) {
            $this->syncMemberPortalUser($member, $password);

            return User::query()->findOrFail($member->user_id);
        }

        return $this->createMemberPortalUser($member, $password, $selfRegistration);
    }
}
