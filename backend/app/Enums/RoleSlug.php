<?php

namespace App\Enums;

enum RoleSlug: string
{
    case SuperAdmin = 'super-admin';
    case AdminNational = 'admin-national';
    case ResponsableProvincial = 'responsable-provincial';
    case ResponsableVille = 'responsable-ville';
    case ResponsableLocal = 'responsable-local';
    case AgentVerification = 'agent-verification';
    case Membre = 'membre';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super administrateur',
            self::AdminNational => 'Administrateur national',
            self::ResponsableProvincial => 'Responsable provincial',
            self::ResponsableVille => 'Responsable ville / territoire',
            self::ResponsableLocal => 'Responsable local',
            self::AgentVerification => 'Agent de vérification',
            self::Membre => 'Membre',
        };
    }

    /**
     * Niveau territorial imposé au compte.
     * 0 = national, 1 = province, 2 = ville, 3 = structure, 4 = personnel.
     */
    public function scopeLevel(): int
    {
        return match ($this) {
            self::SuperAdmin, self::AdminNational, self::AgentVerification => 0,
            self::ResponsableProvincial => 1,
            self::ResponsableVille => 2,
            self::ResponsableLocal => 3,
            self::Membre => 4,
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
