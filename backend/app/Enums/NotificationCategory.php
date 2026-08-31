<?php

namespace App\Enums;

enum NotificationCategory: string
{
    case Member = 'member';
    case Activity = 'activity';
    case Presence = 'presence';
    case News = 'news';
    case Message = 'message';
    case Admin = 'admin';
    case Security = 'security';

    public function label(): string
    {
        return match ($this) {
            self::Member => 'Membre',
            self::Activity => 'Activités',
            self::Message => 'Messages',
            self::Presence => 'Présences',
            self::News => 'Actualités',
            self::Admin => 'Administration',
            self::Security => 'Sécurité',
        };
    }
}
