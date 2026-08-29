<?php

namespace App\Enums;

enum BiometricContext: string
{
    case Login = 'LOGIN';
    case MemberVerification = 'MEMBER_VERIFICATION';
    case Attendance = 'ATTENDANCE';
    case BiometricRegistration = 'BIOMETRIC_REGISTRATION';
    case SecurityConfirmation = 'SECURITY_CONFIRMATION';

    public function label(): string
    {
        return match ($this) {
            self::Login => 'Connexion',
            self::MemberVerification => 'Vérification membre',
            self::Attendance => 'Présence',
            self::BiometricRegistration => 'Configuration biométrie',
            self::SecurityConfirmation => 'Confirmation sécurité',
        };
    }

    public function auditAction(): string
    {
        return match ($this) {
            self::Login => 'BIOMETRIC_LOGIN',
            self::MemberVerification => 'BIOMETRIC_MEMBER_VERIFICATION',
            self::Attendance => 'BIOMETRIC_ATTENDANCE',
            self::BiometricRegistration => 'BIOMETRIC_REGISTRATION',
            self::SecurityConfirmation => 'BIOMETRIC_SECURITY_CONFIRMATION',
        };
    }

    /** Les contextes d'identification découvrable (sans saisie préalable). */
    public function isDiscoverable(): bool
    {
        return match ($this) {
            self::Login, self::MemberVerification, self::Attendance => true,
            default => false,
        };
    }
}
