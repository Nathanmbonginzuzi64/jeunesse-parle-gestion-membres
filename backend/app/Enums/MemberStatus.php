<?php

namespace App\Enums;

enum MemberStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Inactive = 'inactive';
    case Suspended = 'suspended';
    case Archived = 'archived';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Active => 'Actif',
            self::Inactive => 'Inactif',
            self::Suspended => 'Suspendu',
            self::Archived => 'Archivé',
        };
    }

    /** Un membre doit être actif pour qu'une carte lui soit délivrée ou reconnue valide. */
    public function allowsCard(): bool
    {
        return $this === self::Active;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
