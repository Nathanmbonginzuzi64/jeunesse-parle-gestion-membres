<?php

namespace App\Services;

use App\Enums\CardStatus;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CardService
{
    public function __construct(
        private readonly IdentifierGenerator $identifiers,
        private readonly QrCodeService $qrCodes,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Émet une nouvelle carte. Toute carte active précédente est marquée « remplacée »
     * et son QR code est invalidé dans la même transaction.
     */
    public function issue(Member $member, ?User $issuer = null, ?string $reason = null): MemberCard
    {
        if (! $member->status->allowsCard()) {
            throw ValidationException::withMessages([
                'member' => 'Seul un membre actif peut recevoir une carte.',
            ]);
        }

        return DB::transaction(function () use ($member, $issuer, $reason) {
            $previous = $member->cards()->where('status', CardStatus::Active->value)->get();

            foreach ($previous as $card) {
                $this->qrCodes->revokeForCard($card, $reason ?? 'Carte remplacée');
            }

            $sequence = ((int) $member->cards()->max('sequence')) + 1;
            $validityYears = (int) config('jeunesse.card_validity_years');

            $card = MemberCard::create([
                'member_id' => $member->id,
                'card_number' => $this->identifiers->cardNumber($member->member_code, $sequence),
                'sequence' => $sequence,
                'status' => CardStatus::Active,
                'issued_at' => now()->toDateString(),
                'expires_at' => $validityYears > 0 ? now()->addYears($validityYears)->toDateString() : null,
                'issued_by' => $issuer?->id,
                'template_version' => config('jeunesse.card_template_version'),
            ]);

            foreach ($previous as $card_) {
                $card_->update([
                    'status' => CardStatus::Replaced,
                    'status_reason' => $reason ?? 'Remplacée par '.$card->card_number,
                    'revoked_at' => now(),
                    'replaced_by_card_id' => $card->id,
                ]);
            }

            $this->qrCodes->issueForCard($card);

            $this->audit->log('card.issued', $card, "Carte {$card->card_number} émise pour {$member->member_code}");
            $this->notifications->cardIssued($member, $card);

            return $card->fresh(['activeQrToken']);
        });
    }

    /**
     * Désactive une carte (perte, suspension, expiration) et invalide son QR code.
     */
    public function revoke(MemberCard $card, CardStatus $status, string $reason): MemberCard
    {
        if (! in_array($status, [CardStatus::Inactive, CardStatus::Suspended, CardStatus::Lost, CardStatus::Expired], true)) {
            throw ValidationException::withMessages([
                'status' => 'Statut de révocation invalide.',
            ]);
        }

        return DB::transaction(function () use ($card, $status, $reason) {
            $card->update([
                'status' => $status,
                'status_reason' => $reason,
                'revoked_at' => now(),
            ]);

            $this->qrCodes->revokeForCard($card, $reason);
            $this->audit->log('card.revoked', $card, "Carte {$card->card_number} : {$status->label()} — {$reason}");

            return $card->refresh();
        });
    }

    /** Déclare une carte perdue puis en émet immédiatement une nouvelle. */
    public function replaceLost(MemberCard $card, ?User $issuer, string $reason): MemberCard
    {
        return DB::transaction(function () use ($card, $issuer, $reason) {
            $this->revoke($card, CardStatus::Lost, $reason);

            return $this->issue($card->member, $issuer, 'Remplacement carte perdue');
        });
    }
}
