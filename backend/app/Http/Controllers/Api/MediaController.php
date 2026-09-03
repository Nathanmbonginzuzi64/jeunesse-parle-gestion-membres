<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActivityStatus;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ChatAttachment;
use App\Models\Member;
use App\Models\QrToken;
use App\Models\User;
use App\Services\ActivityImageStorageService;
use App\Services\ChatDirectoryService;
use App\Services\ChatMediaStorageService;
use App\Services\NewsMediaStorageService;
use App\Services\PhotoStorageService;
use App\Models\NewsPost;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MediaController extends Controller
{
    public function __construct(
        private readonly PhotoStorageService $photos,
        private readonly ActivityImageStorageService $activityImages,
        private readonly NewsMediaStorageService $newsMedia,
        private readonly ChatMediaStorageService $chatMedia,
        private readonly ChatDirectoryService $chatDirectory,
    ) {}

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
     * Photo du compte utilisateur (photo de profil, sinon photo du dossier membre lié).
     */
    public function userPhoto(Request $request, User $user): Response
    {
        $actor = $request->user();
        abort_unless(
            $actor && ($actor->can('view', $user) || $this->chatDirectory->canSeeUserPhoto($actor, $user)),
            403,
            "Vous n'avez pas l'autorisation d'effectuer cette action.",
        );

        $user->loadMissing('member:id,photo_path,member_code');

        $path = $user->photo_path ?: $user->member?->photo_path;

        abort_unless($path, 404, 'Ressource introuvable.');

        return $this->stream($path, 'user-'.$user->id);
    }

    public function chatAttachment(Request $request, ChatAttachment $attachment): Response
    {
        $attachment->loadMissing('message.conversation');
        $conversation = $attachment->message?->conversation;
        abort_unless($conversation, 404, 'Ressource introuvable.');
        $this->authorize('view', $conversation);

        $contents = $this->chatMedia->get($attachment->path);
        abort_unless($contents !== null, 404, 'Ressource introuvable.');

        $inline = str_starts_with($attachment->mime, 'image/') || str_starts_with($attachment->mime, 'audio/');

        return response($contents, 200, [
            'Content-Type' => $this->chatMedia->mimeFor($attachment->path, $attachment->mime),
            'Cache-Control' => 'private, max-age=600',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment')
                .'; filename="'.$attachment->original_name.'"',
        ]);
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

    /** Image de couverture d'une activité (accès authentifié). */
    public function activityImage(Request $request, string $activity): Response
    {
        $record = Activity::where('code', $activity)->firstOrFail();
        $user = $request->user();

        if (! $user->can('view', $record)) {
            abort_unless(
                $user->hasRole(RoleSlug::Membre) && $this->memberCanAccessActivity($user, $record),
                403,
                "Vous n'avez pas l'autorisation d'effectuer cette action.",
            );
        }

        abort_unless($record->image_path, 404, 'Ressource introuvable.');

        return $this->streamActivity($record->image_path, $record->code);
    }

    /** Un membre actif peut voir l'image des activités de son périmètre. */
    private function memberCanAccessActivity(User $user, Activity $activity): bool
    {
        $user->loadMissing('member');
        $member = $user->member;
        if (! $member || $member->status?->value !== 'active') {
            return false;
        }

        if ($activity->status === ActivityStatus::Cancelled) {
            return false;
        }

        return (bool) $activity->is_public
            || ($member->structure_id && (int) $activity->structure_id === (int) $member->structure_id)
            || ($member->province_id && (int) $activity->province_id === (int) $member->province_id)
            || $activity->members()->where('members.id', $member->id)->exists();
    }

    /** Média principal d'une actualité (image, vidéo ou PDF). */
    public function newsFile(Request $request, NewsPost $newsPost): Response|BinaryFileResponse
    {
        abort_unless($newsPost->media_path, 404, 'Ressource introuvable.');

        return $this->streamNews($newsPost->media_path, 'news-'.$newsPost->id);
    }

    /** Image de galerie d'une actualité. */
    public function newsGallery(Request $request, NewsPost $newsPost, int $index): Response|BinaryFileResponse
    {
        $paths = $newsPost->gallery_paths ?? [];
        abort_unless(isset($paths[$index]), 404, 'Ressource introuvable.');

        return $this->streamNews($paths[$index], 'news-'.$newsPost->id.'-'.$index);
    }

    private function streamNews(string $path, string $reference): BinaryFileResponse
    {
        $absolute = $this->newsMedia->absolutePath($path);

        abort_unless($absolute !== null, 404, 'Ressource introuvable.');

        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $asAttachment = request()->boolean('download');

        return response()->file($absolute, [
            'Content-Type' => $this->newsMedia->mimeFor($path),
            'Cache-Control' => 'private, max-age=600',
            'Content-Disposition' => ($asAttachment ? 'attachment' : 'inline')
                .'; filename="'.$reference.'.'.$extension.'"',
        ]);
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

    private function streamActivity(string $path, string $reference): Response
    {
        $contents = $this->activityImages->get($path);

        abort_unless($contents !== null, 404, 'Ressource introuvable.');

        return response($contents, 200, [
            'Content-Type' => $this->activityImages->mimeFor($path),
            'Cache-Control' => 'private, max-age=600',
            'Content-Disposition' => 'inline; filename="'.$reference.'.'.pathinfo($path, PATHINFO_EXTENSION).'"',
        ]);
    }
}
