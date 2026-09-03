<?php

namespace App\Services;

use App\Models\Member;
use App\Models\MemberCard;
use App\Models\Setting;

class CardPresentationService
{
    public function __construct(private readonly QrCodeService $qrCodes) {}

    /** Données de rendu recto/verso pour l'interface cartes. */
    public function render(Member $member, MemberCard $card): array
    {
        $member->loadMissing(['province', 'city', 'commune', 'structure']);
        $card->loadMissing('activeQrToken');

        $token = $card->activeQrToken;

        return [
            'organization' => Setting::get('organization.name', config('jeunesse.organization.name')),
            'country' => Setting::get('organization.country', config('jeunesse.organization.country')),
            'member_code' => $member->member_code,
            'full_name' => $member->full_name,
            'last_name' => $member->last_name,
            'first_name' => $member->first_name,
            'middle_name' => $member->middle_name,
            'photo_url' => $member->photo_path ? route('media.member-photo', ['member' => $member->member_code]) : null,
            'structure' => $member->structure?->name,
            'province' => $member->province?->name,
            'city' => $member->city?->name,
            'commune' => $member->commune?->name,
            'position' => $member->position,
            'status' => $member->status->label(),
            'card_status' => $card->status->value,
            'card_status_label' => $card->status->label(),
            'issued_at' => $card->issued_at?->toDateString(),
            'expires_at' => $card->expires_at?->toDateString(),
            'verification_url' => $token ? $this->qrCodes->verificationUrl($token->token) : null,
            'qr_svg' => $token ? $this->qrCodes->renderDataUri($this->qrCodes->verificationUrl($token->token)) : null,
        ];
    }
}
