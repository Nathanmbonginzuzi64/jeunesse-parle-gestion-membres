<?php

namespace App\Enums;

enum NewsCategory: string
{
    case General = 'general';
    case Official = 'official';
    case Activity = 'activity';
    case Training = 'training';
    case Opportunity = 'opportunity';
    case Press = 'press';

    public function label(): string
    {
        return match ($this) {
            self::General => 'Actualité générale',
            self::Official => 'Annonce officielle',
            self::Activity => 'Activité',
            self::Training => 'Formation',
            self::Opportunity => 'Opportunité',
            self::Press => 'Communiqué',
        };
    }

    public function badge(): string
    {
        return match ($this) {
            self::Official => '📢 OFFICIEL',
            self::Activity => '📅 ACTIVITÉ',
            self::Training => '🎓 FORMATION',
            self::Opportunity => '🚀 OPPORTUNITÉ',
            self::Press => '📰 COMMUNIQUÉ',
            default => '',
        };
    }
}
