<?php

namespace App\Services;

use App\Enums\NotificationCategory;
use App\Enums\NotificationType;
use App\Enums\Permission;
use App\Events\AppNotificationCreated;
use App\Models\Activity;
use App\Models\AppNotification;
use App\Models\JpMessage;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\NewsPost;
use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Moteur central des notifications Jeunesse Parle.
 *
 * Canal actif : database (+ broadcast WebSocket si configuré).
 * Push FCM / e-mail : structure prête via logs et device_tokens.
 */
class NotificationService
{
    public function pushToUser(
        User $user,
        NotificationType|string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        ?string $level = null,
        ?Member $member = null,
        ?User $author = null,
    ): ?AppNotification {
        $typeEnum = $type instanceof NotificationType
            ? $type
            : (NotificationType::tryFrom($type) ?? NotificationType::Manual);

        if (! $this->isEnabledForUser($user, $typeEnum)) {
            $this->logSkipped($user, $typeEnum, $author);

            return null;
        }

        $notification = AppNotification::create([
            'user_id' => $user->id,
            'member_id' => $member?->id,
            'author_id' => $author?->id,
            'type' => $typeEnum->value,
            'category' => $typeEnum->category()->value,
            'title' => $title,
            'body' => $body,
            'data' => $data ?: null,
            'channel' => 'database',
            'level' => $level ?? $typeEnum->defaultLevel(),
            'sent_at' => now(),
        ]);

        $this->logDelivery($notification, $user, 'sent', $author);
        $this->dispatchRealtime($notification);
        $this->attemptPush($notification, $user);

        return $notification;
    }

    public function push(
        ?Member $member,
        NotificationType|string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        ?string $level = null,
        ?User $author = null,
    ): ?AppNotification {
        if (! $member?->user_id) {
            return null;
        }

        $user = $member->user ?? User::find($member->user_id);
        if (! $user) {
            return null;
        }

        return $this->pushToUser($user, $type, $title, $body, $data, $level, $member, $author);
    }

    // --- Membres ---

    public function memberWelcome(Member $member): void
    {
        $this->push(
            $member,
            NotificationType::MemberWelcome,
            '🎉 Bienvenue sur Jeunesse Parle 🇨🇩',
            "Votre compte membre a été créé avec succès.\n\nVotre ID membre :\n{$member->member_code}",
            ['member_code' => $member->member_code, 'action' => 'view_profile'],
            'success',
        );
    }

    public function memberValidated(Member $member, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::AccountValidated,
            '✅ Compte validé',
            'Votre profil Jeunesse Parle est maintenant actif.',
            ['member_code' => $member->member_code, 'action' => 'view_profile'],
            'success',
            $author,
        );
    }

    public function memberStatusChanged(Member $member, string $status, ?string $reason, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::AccountStatusChanged,
            'Statut de votre compte mis à jour',
            trim("Votre compte est désormais : {$status}. ".($reason ?? '')),
            ['status' => $status, 'reason' => $reason],
            in_array($status, ['Suspendu', 'Archivé'], true) ? 'warning' : 'info',
            $author,
        );
    }

    public function cardIssued(Member $member, MemberCard $card, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::CardIssued,
            '🪪 Votre carte membre est disponible',
            "Votre carte numérique a été créée.\nCarte n° {$card->card_number}.",
            ['card_number' => $card->card_number, 'action' => 'view_card'],
            'success',
            $author,
        );
    }

    public function cardExpiringSoon(Member $member, MemberCard $card, int $daysLeft): void
    {
        $this->push(
            $member,
            NotificationType::CardExpiring,
            '⚠️ Carte bientôt expirée',
            "Votre carte membre expire dans {$daysLeft} jour(s).",
            ['card_number' => $card->card_number, 'days_left' => $daysLeft, 'action' => 'view_card'],
            'warning',
        );
    }

    // --- Activités ---

    public function activityPublished(Member $member, Activity $activity, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::ActivityPublished,
            '📅 Nouvelle activité',
            $this->activityBody($activity),
            $this->activityData($activity, ['action' => 'view_activity', 'action_join' => 'join_activity']),
            'info',
            $author,
        );
    }

    public function activityInvitation(Member $member, Activity $activity, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::ActivityInvitation,
            '📅 Nouvelle activité',
            $this->activityBody($activity),
            $this->activityData($activity, ['action' => 'view_activity', 'action_join' => 'join_activity']),
            'info',
            $author,
        );
    }

    public function activityUpdated(Member $member, Activity $activity, array $changes, ?User $author = null): void
    {
        $lines = collect($changes)->map(fn ($v, $k) => ucfirst($k)." : {$v}")->implode("\n");

        $this->push(
            $member,
            NotificationType::ActivityUpdated,
            '⚠️ Modification activité',
            "L'activité « {$activity->title} » a été modifiée.\n\n{$lines}",
            $this->activityData($activity, ['changes' => $changes, 'action' => 'view_activity']),
            'warning',
            $author,
        );
    }

    public function activityReminder(Member $member, Activity $activity, string $window): void
    {
        $title = $window === '1h'
            ? '🔔 L\'activité commence bientôt'
            : '⏰ Rappel activité';

        $body = $window === '1h'
            ? "« {$activity->title} » commence dans une heure."
            : "Votre activité « {$activity->title} » commence demain.";

        $this->push(
            $member,
            NotificationType::ActivityReminder,
            $title,
            $body,
            $this->activityData($activity, ['reminder_window' => $window, 'action' => 'view_activity']),
            'info',
        );
    }

    public function liveLocationAvailable(Member $member, Activity $activity): void
    {
        $this->push(
            $member,
            NotificationType::ActivityLiveLocation,
            '📍 Localisation disponible',
            "Le responsable de l'activité « {$activity->title} » partage maintenant sa position.\n\nSuivez le déplacement en temps réel.",
            $this->activityData($activity, ['action' => 'view_maps', 'event' => 'start']),
            'info',
        );
    }

    // --- Présence ---

    public function attendanceRecorded(Member $member, Activity $activity, string $status, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::AttendanceRecorded,
            '✅ Présence confirmée',
            "Votre participation à :\n{$activity->title}\na été enregistrée.\n\nHeure :\n".now()->format('H:i'),
            $this->activityData($activity, ['status' => $status, 'recorded_at' => now()->toIso8601String()]),
            'success',
            $author,
        );
    }

    public function attendanceFailed(Member $member, ?Activity $activity = null, ?string $reason = null): void
    {
        $this->push(
            $member,
            NotificationType::AttendanceFailed,
            '❌ Identification impossible',
            $reason ?? 'Votre identité n\'a pas pu être vérifiée.',
            $activity ? $this->activityData($activity) : [],
            'danger',
        );
    }

    // --- Actualités ---

    public function newsPublished(Member $member, NewsPost $post, ?User $author = null): void
    {
        $this->push(
            $member,
            NotificationType::NewsPublished,
            '📰 Nouvelle actualité',
            "Jeunesse Parle vient de publier :\n« {$post->title} »",
            ['news_post_id' => $post->id, 'action' => 'view_news'],
            'info',
            $author,
        );
    }

    public function newsCommentReceived(Member $recipient, NewsPost $post, Member $commenter): void
    {
        $this->push(
            $recipient,
            NotificationType::NewsComment,
            '💬 Nouveau commentaire',
            "{$commenter->full_name} a commenté votre publication.",
            ['news_post_id' => $post->id, 'commenter' => $commenter->full_name, 'action' => 'view_news'],
            'info',
        );
    }

    public function newsReactionReceived(Member $recipient, NewsPost $post, Member $reactor): void
    {
        $this->push(
            $recipient,
            NotificationType::NewsReaction,
            '❤️ Nouvelle réaction',
            'Votre publication a reçu une réaction.',
            ['news_post_id' => $post->id, 'reactor' => $reactor->full_name, 'action' => 'view_news'],
            'info',
        );
    }

    public function newsShareReceived(Member $recipient, NewsPost $post, Member $sharer): void
    {
        $this->push(
            $recipient,
            NotificationType::NewsShare,
            '↗ Publication partagée',
            "{$sharer->full_name} a partagé votre publication.",
            ['news_post_id' => $post->id, 'action' => 'view_news'],
            'info',
        );
    }

    // --- JP Messages ---

    public function jpMessageCreatedForAdmins(JpMessage $message): void
    {
        $message->loadMissing(['author', 'member']);
        $member = $message->member;
        $isContact = ($message->source ?? 'member') === 'contact';
        $isStaff = ($message->source ?? '') === 'staff';

        $categoryLabel = match ($message->category) {
            'plainte' => 'Plainte',
            'doleance' => 'Doléance',
            'demande' => 'Demande',
            'preoccupation' => 'Préoccupation',
            default => 'Suggestion',
        };

        $authorName = $member?->full_name
            ?? $message->author?->name
            ?? ($message->guest_name
                ? ($message->guest_name.($message->guest_email ? " ({$message->guest_email})" : ''))
                : 'Utilisateur');

        $title = $isContact ? '📩 Message Contact (site)' : '📩 Nouvelle conversation JP Message';
        $body = $isContact
            ? "Un visiteur a envoyé un message via le formulaire Contact.\n\nDe :\n{$authorName}\n\nSujet :\n{$message->subject}"
            : ($isStaff
                ? "Un utilisateur du portail a ouvert une conversation.\n\nDe :\n{$authorName}\n\nCatégorie :\n{$categoryLabel}"
                : "Un membre vient d'envoyer une nouvelle demande.\n\nMembre :\n{$authorName}\n\nCatégorie :\n{$categoryLabel}");

        foreach ($this->adminUsers(Permission::UsersView) as $admin) {
            $this->pushToUser(
                $admin,
                NotificationType::JpMessageCreated,
                $title,
                $body,
                [
                    'jp_message_id' => $message->id,
                    'reference' => $message->reference,
                    'member_code' => $member?->member_code,
                    'source' => $message->source ?? 'member',
                    'action' => 'view_jp_message',
                ],
                'info',
                $member,
            );
        }
    }

    public function jpMessageReplyReceived(Member $member, JpMessage $message): void
    {
        $this->push(
            $member,
            NotificationType::JpMessageReply,
            '💬 Réponse reçue',
            'Votre message a reçu une réponse de l\'administration.',
            ['jp_message_id' => $message->id, 'reference' => $message->reference, 'action' => 'view_jp_message'],
            'info',
        );
    }

    // --- Administration ---

    public function adminNewMember(Member $member, ?User $author = null): void
    {
        $province = $member->province?->name ?? '—';
        $admins = $this->adminUsers(Permission::MembersValidate)
            ->merge($this->adminUsers(Permission::MembersCreate))
            ->unique('id');

        foreach ($admins as $admin) {
            $this->pushToUser(
                $admin,
                NotificationType::AdminNewMember,
                'Demande d\'adhésion à approuver',
                "{$member->full_name} a envoyé une demande pour rejoindre Jeunesse Parle.\n\nCode : {$member->member_code}\nProvince : {$province}\n\nOuvrez Membres → En attente, puis Valider le dossier.",
                ['member_id' => $member->id, 'member_code' => $member->member_code, 'action' => 'view_member'],
                'warning',
                $member,
                $author,
            );
        }
    }

    public function adminNewActivity(Activity $activity, ?User $author = null): void
    {
        foreach ($this->adminUsers(Permission::ActivitiesManage) as $admin) {
            $this->pushToUser(
                $admin,
                NotificationType::AdminNewActivity,
                '📅 Nouvelle activité créée',
                "« {$activity->title} » — {$activity->code}",
                $this->activityData($activity, ['action' => 'view_activity']),
                'info',
                null,
                $author,
            );
        }
    }

    /** Vérification carte (QR / biométrie) — admins dans le périmètre du membre. */
    public function adminCardVerified(Member $member, string $result, ?User $author = null, string $method = 'qr'): void
    {
        $label = match ($result) {
            'valid' => 'validée',
            'revoked' => 'carte révoquée',
            'expired' => 'carte expirée',
            'inactive' => 'membre inactif',
            default => $result,
        };
        $agent = $author?->name ?? 'Agent';
        $level = $result === 'valid' ? 'success' : 'warning';

        foreach ($this->adminsForMember($member, Permission::CardsVerify) as $admin) {
            if ($author && (int) $admin->id === (int) $author->id) {
                continue;
            }

            $this->pushToUser(
                $admin,
                NotificationType::AdminCardVerified,
                $result === 'valid' ? 'Carte vérifiée' : 'Vérification carte — alerte',
                "{$agent} a vérifié {$member->full_name} ({$member->member_code}) — résultat : {$label} ({$method}).",
                [
                    'member_id' => $member->id,
                    'member_code' => $member->member_code,
                    'result' => $result,
                    'method' => $method,
                    'action' => 'view_member',
                ],
                $level,
                $member,
                $author,
            );
        }
    }

    /** Pointage enregistré — admins avec attendance.view dans le périmètre. */
    public function adminAttendanceRecorded(Member $member, Activity $activity, string $status, ?User $author = null): void
    {
        $agent = $author?->name ?? 'Agent';

        foreach ($this->adminsForMember($member, Permission::AttendanceView) as $admin) {
            if ($author && (int) $admin->id === (int) $author->id) {
                continue;
            }

            $this->pushToUser(
                $admin,
                NotificationType::AdminAttendanceRecorded,
                'Présence enregistrée',
                "{$agent} a pointé {$member->full_name} ({$member->member_code}) — {$status} · {$activity->title}.",
                $this->activityData($activity, [
                    'member_id' => $member->id,
                    'member_code' => $member->member_code,
                    'status' => $status,
                    'action' => 'view_attendance',
                ]),
                'success',
                $member,
                $author,
            );
        }
    }

    public function adminSystemAlert(string $title, string $body, array $data = [], ?User $author = null): void
    {
        foreach ($this->adminUsers(Permission::AuditView) as $admin) {
            $this->pushToUser(
                $admin,
                NotificationType::AdminSystemAlert,
                $title,
                $body,
                $data,
                'danger',
                null,
                $author,
            );
        }
    }

    /** Diffusion territoriale par lots (actualités, activités publiques). */
    public function broadcastToMembers(
        Collection $members,
        NotificationType $type,
        string $title,
        ?string $body,
        array $data = [],
        ?User $author = null,
    ): int {
        $sent = 0;

        foreach ($members as $member) {
            if ($this->push($member, $type, $title, $body, $data, null, $author)) {
                $sent++;
            }
        }

        return $sent;
    }

    // --- Internals ---

    private function isEnabledForUser(User $user, NotificationType $type): bool
    {
        $prefs = NotificationPreference::defaultsFor($user);
        $category = $type->category();

        return match ($category) {
            NotificationCategory::Activity => $prefs->activity && ($type !== NotificationType::ActivityReminder || $prefs->reminder),
            NotificationCategory::News => $prefs->news,
            NotificationCategory::Message => $prefs->message,
            NotificationCategory::Presence => $prefs->presence,
            NotificationCategory::Security => $prefs->security,
            NotificationCategory::Member => true,
            NotificationCategory::Admin => true,
        };
    }

    private function logSkipped(User $user, NotificationType $type, ?User $author): void
    {
        NotificationLog::create([
            'user_id' => $user->id,
            'type' => $type->value,
            'channel' => 'database',
            'status' => 'skipped',
            'recipient_label' => $user->email ?? $user->phone ?? (string) $user->id,
            'author_id' => $author?->id,
            'sent_at' => now(),
            'meta' => ['reason' => 'preferences_disabled'],
        ]);
    }

    private function logDelivery(
        AppNotification $notification,
        User $user,
        string $status,
        ?User $author,
        ?string $channel = 'database',
        ?string $error = null,
    ): void {
        NotificationLog::create([
            'notification_id' => $notification->id,
            'user_id' => $user->id,
            'type' => $notification->type,
            'channel' => $channel,
            'status' => $status,
            'recipient_label' => $user->email ?? $user->phone ?? (string) $user->id,
            'author_id' => $author?->id ?? $notification->author_id,
            'sent_at' => now(),
            'received_at' => $status === 'delivered' ? now() : null,
            'error' => $error,
        ]);
    }

    private function dispatchRealtime(AppNotification $notification): void
    {
        try {
            broadcast(new AppNotificationCreated($notification))->toOthers();
        } catch (\Throwable) {
            // Broadcasting optionnel (Pusher/Reverb) — la notification in-app reste disponible.
        }
    }

    private function attemptPush(AppNotification $notification, User $user): void
    {
        $prefs = NotificationPreference::defaultsFor($user);
        if (! $prefs->push_enabled) {
            return;
        }

        $tokens = $user->deviceTokens()->pluck('token');
        if ($tokens->isEmpty()) {
            return;
        }

        // FCM : brancher kreait/firebase-php ici lorsque les clés sont configurées.
        foreach ($tokens as $token) {
            $this->logDelivery($notification, $user, 'sent', null, 'push', null);
        }
    }

    /** @return Collection<int, User> */
    private function adminUsers(Permission $permission): Collection
    {
        return User::query()
            ->where('is_active', true)
            ->get()
            ->filter(fn (User $user) => $user->hasPermission($permission));
    }

    /**
     * Admins concernés par un membre (permission + périmètre territorial).
     *
     * @return Collection<int, User>
     */
    private function adminsForMember(Member $member, Permission $permission): Collection
    {
        return $this->adminUsers($permission)
            ->merge($this->adminUsers(Permission::AuditView))
            ->unique('id')
            ->filter(fn (User $admin) => $member->isVisibleTo($admin))
            ->values();
    }

    private function activityBody(Activity $activity): string
    {
        $parts = ["Une nouvelle activité est disponible :\n\n{$activity->title}"];

        if ($activity->starts_at) {
            $parts[] = "\nDate :\n".$activity->starts_at->translatedFormat('d F Y à H:i');
        }

        if ($activity->location) {
            $parts[] = "\nLieu :\n{$activity->location}";
        }

        return implode('', $parts);
    }

    /** @param  array<string, mixed>  $extra */
    private function activityData(Activity $activity, array $extra = []): array
    {
        return array_merge([
            'activity_id' => $activity->id,
            'code' => $activity->code,
            'title' => $activity->title,
        ], $extra);
    }
}
