<?php

namespace App\Services;

use App\Models\QrToken;
use App\Models\User;
use App\Models\VerificationLog;
use Illuminate\Http\Request;

/**
 * Vérification d'une carte à partir de son jeton QR.
 *
 * Le résultat public est volontairement minimal : il confirme l'appartenance
 * sans divulguer les coordonnées ni les données sensibles du membre.
 */
class VerificationService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @return array{result: string, valid: bool, message: string, member: ?array}
     */
    public function verify(string $token, Request $request, ?User $actor = null, string $context = 'public'): array
    {
        /** @var QrToken|null $qrToken */
        $qrToken = QrToken::with(['member.province', 'member.city', 'member.structure', 'card'])
            ->where('token', $token)
            ->first();

        if (! $qrToken) {
            $this->logAttempt(null, $token, 'not_found', $request, $actor, $context);

            return $this->failure('not_found', 'Aucune carte ne correspond à ce QR code.');
        }

        $result = $this->evaluate($qrToken);

        $qrToken->forceFill([
            'last_scanned_at' => now(),
            'scan_count' => $qrToken->scan_count + 1,
        ])->save();

        $this->logAttempt($qrToken, $token, $result, $request, $actor, $context);

        if ($result !== 'valid') {
            return $this->failure($result, $this->messageFor($result));
        }

        return [
            'result' => 'valid',
            'valid' => true,
            'message' => 'Membre vérifié.',
            'member' => $this->publicPayload($qrToken, $actor),
        ];
    }

    private function evaluate(QrToken $qrToken): string
    {
        if ($qrToken->status === 'revoked') {
            return 'revoked';
        }

        if ($qrToken->isExpired()) {
            return 'expired';
        }

        $card = $qrToken->card;

        if (! $card || ! $card->status->isUsable()) {
            return 'revoked';
        }

        if ($card->isExpired()) {
            return 'expired';
        }

        if (! $qrToken->member || ! $qrToken->member->status->allowsCard()) {
            return 'inactive';
        }

        return 'valid';
    }

    /**
     * Charge utile renvoyée après un scan réussi.
     * Un agent authentifié disposant de la permission voit quelques champs de plus.
     */
    private function publicPayload(QrToken $qrToken, ?User $actor): array
    {
        $member = $qrToken->member;
        $card = $qrToken->card;

        $enrolled = $member->webAuthnCredentials()->exists();

        $payload = [
            'member_id' => $member->id,
            'member_code' => $member->member_code,
            'full_name' => $member->full_name,
            // La photo n'est servie qu'à qui détient un jeton valide, jamais par code membre.
            'photo_url' => $member->photo_path
                ? route('media.verification-photo', ['token' => $qrToken->token])
                : null,
            'gender' => $member->gender?->label(),
            'province' => $member->province?->name,
            'city' => $member->city?->name,
            'structure' => $member->structure?->name,
            'position' => $member->position,
            'status' => $member->status->label(),
            'card_number' => $card->card_number,
            'card_status' => $card->status->label(),
            'issued_at' => $card->issued_at?->toDateString(),
            'expires_at' => $card->expires_at?->toDateString(),
            'joined_at' => $member->joined_at?->toDateString(),
            'fingerprint_enrolled' => $enrolled,
            'fingerprints_count' => $enrolled ? $member->webAuthnCredentials()->count() : 0,
        ];

        if ($actor?->hasPermission(\App\Enums\Permission::MembersViewSensitive)) {
            $payload['phone'] = $member->phone;
        }

        return $payload;
    }

    private function logAttempt(
        ?QrToken $qrToken,
        string $token,
        string $result,
        Request $request,
        ?User $actor,
        string $context,
    ): void {
        VerificationLog::create([
            'member_id' => $qrToken?->member_id,
            'member_card_id' => $qrToken?->member_card_id,
            'qr_token_id' => $qrToken?->id,
            'token_fingerprint' => substr($token, 0, 8),
            'result' => $result,
            'verified_by' => $actor?->id,
            'context' => $context,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    private function messageFor(string $result): string
    {
        return match ($result) {
            'revoked' => 'Cette carte a été désactivée. Le QR code n\'est plus valide.',
            'expired' => 'Cette carte est expirée.',
            'inactive' => 'Le compte de ce membre n\'est pas actif.',
            default => 'Aucune carte ne correspond à ce QR code.',
        };
    }

    private function failure(string $result, string $message): array
    {
        return [
            'result' => $result,
            'valid' => false,
            'message' => $message,
            'member' => null,
        ];
    }
}
