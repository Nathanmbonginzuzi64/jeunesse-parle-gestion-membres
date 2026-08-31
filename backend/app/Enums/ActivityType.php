<?php

namespace App\Enums;

enum ActivityType: string
{
    case Reunion = 'reunion';
    case Formation = 'formation';
    case Conference = 'conference';
    case Campagne = 'campagne';
    case Evenement = 'evenement';
    case Mission = 'mission';
    case Communautaire = 'communautaire';

    public function label(): string
    {
        return match ($this) {
            self::Reunion => 'Réunion',
            self::Formation => 'Formation',
            self::Conference => 'Conférence',
            self::Campagne => 'Campagne',
            self::Evenement => 'Événement',
            self::Mission => 'Mission',
            self::Communautaire => 'Activité communautaire',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Accepte une valeur brute ou une instance déjà castée par Eloquent. */
    public static function resolve(string|self $value): self
    {
        return $value instanceof self ? $value : self::from($value);
    }
}
