<?php

namespace App\Services;

use App\Models\MemberCard;
use App\Models\QrToken;
use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Émission et rendu des QR codes de vérification.
 *
 * Le QR encode uniquement une URL de vérification contenant un jeton opaque :
 * aucune donnée personnelle n'y est jamais placée.
 */
class QrCodeService
{
    /**
     * Révoque les jetons en cours de la carte et en émet un nouveau.
     */
    public function issueForCard(MemberCard $card, ?int $validityDays = null): QrToken
    {
        return DB::transaction(function () use ($card, $validityDays) {
            $card->qrTokens()->where('status', 'active')->update([
                'status' => 'revoked',
                'revoked_at' => now(),
                'revoked_reason' => 'Remplacé par un nouveau jeton',
            ]);

            return QrToken::create([
                'member_id' => $card->member_id,
                'member_card_id' => $card->id,
                'token' => $this->generateToken(),
                'status' => 'active',
                'expires_at' => $validityDays ? now()->addDays($validityDays) : $card->expires_at?->endOfDay(),
            ]);
        });
    }

    public function revokeForCard(MemberCard $card, string $reason): void
    {
        $card->qrTokens()->where('status', 'active')->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revoked_reason' => $reason,
        ]);
    }

    public function verificationUrl(string $token): string
    {
        $base = rtrim((string) config('jeunesse.verification_base_url'), '/');

        return $base.'/verifier-membre/'.$token;
    }

    /**
     * Rendu SVG : volontairement sans dépendance à ext-gd / ext-imagick,
     * ce qui garantit le fonctionnement sur tous les environnements de déploiement.
     */
    public function renderSvg(string $payload, int $size = 320): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle($size, 1),
            new SvgImageBackEnd(),
        );

        return (new Writer($renderer))->writeString(
            $payload,
            Encoder::DEFAULT_BYTE_MODE_ENCODING,
            ErrorCorrectionLevel::M(),
        );
    }

    public function renderDataUri(string $payload, int $size = 320): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode($this->renderSvg($payload, $size));
    }

    private function generateToken(): string
    {
        do {
            $token = Str::lower(Str::random(48));
        } while (QrToken::where('token', $token)->exists());

        return $token;
    }
}
