<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Present = 'present';
    case Absent = 'absent';
    case Late = 'late';
    case Excused = 'excused';

    public function label(): string
    {
        return match ($this) {
            self::Present => 'Présent',
            self::Absent => 'Absent',
            self::Late => 'En retard',
            self::Excused => 'Excusé',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
