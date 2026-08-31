<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\AppNotification;
use App\Models\Member;
use App\Models\MemberCard;

/**
 * Point d'entrée unique des notifications.
 *
 * Seul le canal « database » est actif ; les canaux mail / sms / push sont
 * prévus dans le schéma et pourront être branchés ici sans toucher aux appelants.
 */
class NotificationService
{
    public function push(
        ?Member $member,
        string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        string $level = 'info',
    ): ?AppNotification {
        if (! $member) {
            return null;
        }

        return AppNotification::create([
            'user_id' => $member->user_id,
            'member_id' => $member->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data ?: null,
            'channel' => 'database',
            'level' => $level,
            'sent_at' => now(),
        ]);
    }

    public function memberValidated(Member $member): void
    {
        $this->push(
            $member,
            'account_validated',
            'Votre adhésion est validée',
            "Bienvenue dans Jeunesse Parle. Votre identifiant de membre est {$member->member_code}.",
            ['member_code' => $member->member_code],
            'success',
        );
    }

    public function memberStatusChanged(Member $member, string $status, ?string $reason): void
    {
        $this->push(
            $member,
            'account_status_changed',
            'Statut de votre compte mis à jour',
            trim("Votre compte est désormais : {$status}. ".($reason ?? '')),
            ['status' => $status, 'reason' => $reason],
            in_array($status, ['Suspendu', 'Archivé'], true) ? 'warning' : 'info',
        );
    }

    public function cardIssued(Member $member, MemberCard $card): void
    {
        $this->push(
            $member,
            'card_issued',
            'Votre carte de membre est disponible',
            "Carte n° {$card->card_number}. Vous pouvez la consulter et la télécharger depuis votre espace.",
            ['card_number' => $card->card_number],
            'success',
        );
    }

    public function activityInvitation(Member $member, Activity $activity): void
    {
        $this->push(
            $member,
            'activity_invitation',
            'Nouvelle activité : '.$activity->title,
            $activity->starts_at->translatedFormat('d/m/Y à H:i').($activity->location ? ' — '.$activity->location : ''),
            ['activity_id' => $activity->id, 'code' => $activity->code],
        );
    }

    public function attendanceRecorded(Member $member, Activity $activity, string $status): void
    {
        $this->push(
            $member,
            'attendance_recorded',
            'Votre présence vient d\'être confirmée',
            "Activité : {$activity->title}\nDate : ".$activity->starts_at?->translatedFormat('d F Y')."\nHeure : ".now()->format('H:i'),
            ['activity_id' => $activity->id, 'status' => $status, 'recorded_at' => now()->toIso8601String()],
            'success',
        );
    }

    public function liveLocationAvailable(Member $member, Activity $activity): void
    {
        $this->push(
            $member,
            'activity_live_location',
            '📍 Localisation disponible',
            'Le responsable de l\'activité est actuellement en route. Suivez l\'emplacement du lieu en temps réel.',
            ['activity_id' => $activity->id, 'code' => $activity->code],
            'info',
        );
    }
}
