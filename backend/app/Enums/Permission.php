<?php

namespace App\Enums;

/**
 * Catalogue central des permissions. Toute autorisation backend s'appuie
 * exclusivement sur ces slugs (jamais sur le nom du rôle en dur).
 */
enum Permission: string
{
    // Membres
    case MembersView = 'members.view';
    case MembersCreate = 'members.create';
    case MembersUpdate = 'members.update';
    case MembersDelete = 'members.delete';
    case MembersValidate = 'members.validate';
    case MembersChangeStatus = 'members.change-status';
    case MembersExport = 'members.export';
    case MembersViewSensitive = 'members.view-sensitive';

    // Cartes & QR
    case CardsView = 'cards.view';
    case CardsIssue = 'cards.issue';
    case CardsRevoke = 'cards.revoke';
    case CardsVerify = 'cards.verify';

    // Structures & territoires
    case StructuresView = 'structures.view';
    case StructuresManage = 'structures.manage';
    case TerritoriesManage = 'territories.manage';

    // Activités & présences
    case ActivitiesView = 'activities.view';
    case ActivitiesManage = 'activities.manage';
    case AttendanceView = 'attendance.view';
    case AttendanceRecord = 'attendance.record';

    // Utilisateurs & rôles
    case UsersView = 'users.view';
    case UsersManage = 'users.manage';
    case RolesManage = 'roles.manage';

    // Pilotage
    case StatisticsView = 'statistics.view';
    case MapView = 'map.view';
    case AuditView = 'audit.view';
    case SettingsManage = 'settings.manage';
    case NotificationsSend = 'notifications.send';
    case BackupManage = 'backup.manage';
    case TrashView = 'trash.view';
    case TrashManage = 'trash.manage';

    public function label(): string
    {
        return match ($this) {
            self::MembersView => 'Consulter les membres',
            self::MembersCreate => 'Créer un membre',
            self::MembersUpdate => 'Modifier un membre',
            self::MembersDelete => 'Supprimer un membre',
            self::MembersValidate => 'Valider un membre',
            self::MembersChangeStatus => 'Changer le statut d\'un membre',
            self::MembersExport => 'Exporter les membres',
            self::MembersViewSensitive => 'Voir les données sensibles',
            self::CardsView => 'Consulter les cartes',
            self::CardsIssue => 'Émettre une carte',
            self::CardsRevoke => 'Révoquer une carte',
            self::CardsVerify => 'Vérifier une carte',
            self::StructuresView => 'Consulter les structures',
            self::StructuresManage => 'Gérer les structures',
            self::TerritoriesManage => 'Gérer les territoires',
            self::ActivitiesView => 'Consulter les activités',
            self::ActivitiesManage => 'Gérer les activités',
            self::AttendanceView => 'Consulter les présences',
            self::AttendanceRecord => 'Enregistrer les présences',
            self::UsersView => 'Consulter les utilisateurs',
            self::UsersManage => 'Gérer les utilisateurs',
            self::RolesManage => 'Gérer les rôles',
            self::StatisticsView => 'Consulter les statistiques',
            self::MapView => 'Consulter la cartographie',
            self::AuditView => 'Consulter le journal d\'audit',
            self::SettingsManage => 'Gérer les paramètres',
            self::NotificationsSend => 'Envoyer des notifications',
            self::BackupManage => 'Gérer les sauvegardes système',
            self::TrashView => 'Consulter la corbeille',
            self::TrashManage => 'Restaurer ou purger la corbeille',
        };
    }

    public function group(): string
    {
        return explode('.', $this->value)[0];
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
