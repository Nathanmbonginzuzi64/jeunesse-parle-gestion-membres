<?php

namespace App\Enums;

enum CardStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';
    case Expired = 'expired';
    case Lost = 'lost';
    case Replaced = 'replaced';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Suspended => 'Suspendue',
            self::Expired => 'Expirée',
            self::Lost => 'Perdue',
            self::Replaced => 'Remplacée',
        };
    }

    public function isUsable(): bool
    {
        return $this === self::Active;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
