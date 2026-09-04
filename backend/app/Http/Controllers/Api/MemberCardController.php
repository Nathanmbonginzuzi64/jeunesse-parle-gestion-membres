<?php

namespace App\Http\Controllers\Api;

use App\Enums\CardStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\MemberCardResource;
use App\Models\Member;
use App\Models\MemberCard;
use App\Services\CardPresentationService;
use App\Services\CardService;
use App\Services\QrCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MemberCardController extends Controller
{
    public function __construct(
        private readonly CardService $cards,
        private readonly QrCodeService $qrCodes,
        private readonly CardPresentationService $presentation,
    ) {}

    /** Renvoie la carte active et l'ensemble des données nécessaires à son rendu. */
    public function show(Request $request, Member $member): JsonResponse
    {
        $this->authorize('viewCard', $member);

        $card = $member->activeCard()->with('activeQrToken')->first();

        if (! $card) {
            return response()->json([
                'message' => 'Aucune carte active pour ce membre.',
                'data' => null,
            ], 404);
        }

        $member->loadMissing(['province', 'city', 'commune', 'structure']);

        return response()->json([
            'data' => new MemberCardResource($card),
            'render' => $this->presentation->render($member, $card),
        ]);
    }

    public function index(Request $request, Member $member): JsonResponse
    {
        $this->authorize('viewCard', $member);

        return response()->json([
            'data' => MemberCardResource::collection($member->cards()->get()),
        ]);
    }

    public function store(Request $request, Member $member): JsonResponse
    {
        $this->authorize('manageCard', $member);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $card = $this->cards->issue($member, $request->user(), $validated['reason'] ?? null);

        return response()->json([
            'message' => 'Carte générée avec succès.',
            'data' => new MemberCardResource($card),
        ], 201);
    }

    public function revoke(Request $request, Member $member, MemberCard $card): JsonResponse
    {
        $this->authorize('manageCard', $member);

        abort_unless($card->member_id === $member->id, 404, 'Ressource introuvable.');

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                CardStatus::Inactive->value, CardStatus::Suspended->value,
                CardStatus::Lost->value, CardStatus::Expired->value,
            ])],
            'reason' => ['required', 'string', 'max:255'],
            'reissue' => ['nullable', 'boolean'],
        ]);

        $status = CardStatus::from($validated['status']);

        if ($request->boolean('reissue')) {
            $newCard = $this->cards->replaceLost($card, $request->user(), $validated['reason']);

            return response()->json([
                'message' => 'Ancienne carte désactivée. Une nouvelle carte et un nouveau QR code ont été générés.',
                'data' => new MemberCardResource($newCard),
            ]);
        }

        $revoked = $this->cards->revoke($card, $status, $validated['reason']);

        return response()->json([
            'message' => 'Carte désactivée. Son QR code n\'est plus valide.',
            'data' => new MemberCardResource($revoked),
        ]);
    }

    /** Image SVG du QR code de la carte active. */
    public function qr(Request $request, Member $member): Response
    {
        $this->authorize('viewCard', $member);

        $card = $member->activeCard()->with('activeQrToken')->first();
        $token = $card?->activeQrToken;

        abort_unless($token, 404, 'Aucun QR code actif pour ce membre.');

        $svg = $this->qrCodes->renderSvg(
            $this->qrCodes->verificationUrl($token->token),
            (int) $request->integer('size', 512),
        );

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
