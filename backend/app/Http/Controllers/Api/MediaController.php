<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Member;
use App\Models\QrToken;
use App\Services\PhotoStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MediaController extends Controller
{
    public function __construct(private readonly PhotoStorageService $photos) {}

    /**
     * Sert la photo d'un membre depuis le disque privé.
     *
     * Le fichier n'est jamais exposé publiquement : chaque accès repose sur
     * l'authentification et la policy du membre concerné.
     */
    public function memberPhoto(Request $request, string $member): Response
    {
        $record = Member::where('member_code', $member)->firstOrFail();

        $this->authorize('view', $record);

        abort_unless($record->photo_path, 404, 'Ressource introuvable.');

        return $this->stream($record->photo_path, $record->member_code);
    }

    /**
     * Photo affichée sur l'écran de vérification publique.
     *
     * L'accès est porté par le jeton QR lui-même : dès que la carte est révoquée,
     * la photo cesse d'être accessible.
     */
    public function verificationPhoto(string $token): Response
    {
        $qrToken = QrToken::with('member', 'card')->where('token', $token)->first();

        abort_unless($qrToken && $qrToken->isUsable(), 404, 'Ressource introuvable.');
        abort_unless($qrToken->card?->isValid(), 404, 'Ressource introuvable.');

        $member = $qrToken->member;

        abort_unless($member?->photo_path, 404, 'Ressource introuvable.');

        return $this->stream($member->photo_path, $member->member_code);
    }

    private function stream(string $path, string $reference): Response
    {
        $contents = $this->photos->get($path);

        abort_unless($contents !== null, 404, 'Ressource introuvable.');

        return response($contents, 200, [
            'Content-Type' => $this->photos->mimeFor($path),
            'Cache-Control' => 'private, max-age=600',
            'Content-Disposition' => 'inline; filename="'.$reference.'.'.pathinfo($path, PATHINFO_EXTENSION).'"',
        ]);
    }
}
