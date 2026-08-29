<?php

namespace App\Enums;

enum ActivityStatus: string
{
    case Planned = 'planned';
    case Ongoing = 'ongoing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Planned => 'Planifiée',
            self::Ongoing => 'En cours',
            self::Completed => 'Terminée',
            self::Cancelled => 'Annulée',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
