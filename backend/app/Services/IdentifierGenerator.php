<?php

namespace App\Services;

use App\Models\Sequence;

/**
 * Fabrique les identifiants métier lisibles du système.
 * L'identité d'un membre ne repose jamais sur son nom.
 */
class IdentifierGenerator
{
    public const MEMBER_PREFIX = 'JP-RDC-';
    public const ACTIVITY_PREFIX = 'JP-ACT-';
    public const STRUCTURE_PREFIX = 'JP-STR-';

    public function memberCode(): string
    {
        return self::MEMBER_PREFIX.str_pad((string) Sequence::next('member_code'), 8, '0', STR_PAD_LEFT);
    }

    public function activityCode(): string
    {
        return self::ACTIVITY_PREFIX.str_pad((string) Sequence::next('activity_code'), 6, '0', STR_PAD_LEFT);
    }

    public function structureCode(): string
    {
        return self::STRUCTURE_PREFIX.str_pad((string) Sequence::next('structure_code'), 5, '0', STR_PAD_LEFT);
    }

    /** Numéro de carte dérivé du code membre : JP-RDC-00000001-C01 */
    public function cardNumber(string $memberCode, int $sequence): string
    {
        return $memberCode.'-C'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
    }
}
