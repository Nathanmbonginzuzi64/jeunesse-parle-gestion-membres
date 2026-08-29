<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    private const SETTINGS = [
        ['organization.name', 'Jeunesse Parle', 'string', 'organisation', 'Nom de l\'organisation', true],
        ['organization.country', 'République Démocratique du Congo', 'string', 'organisation', 'Pays', true],
        ['membership.auto_validate', '0', 'boolean', 'adhesion', 'Valider automatiquement les inscriptions', false],
        ['membership.minimum_age', '15', 'integer', 'adhesion', 'Âge minimum d\'adhésion', true],
        ['membership.maximum_age', '40', 'integer', 'adhesion', 'Âge maximum d\'adhésion', true],
        ['card.validity_years', '3', 'integer', 'carte', 'Durée de validité d\'une carte (années)', false],
        ['card.template_version', 'v1', 'string', 'carte', 'Version du modèle de carte', false],
        ['security.session_timeout_minutes', '120', 'integer', 'securite', 'Expiration de session (minutes)', false],
    ];

    public function run(): void
    {
        foreach (self::SETTINGS as [$key, $value, $type, $group, $label, $isPublic]) {
            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value,
                    'type' => $type,
                    'group' => $group,
                    'label' => $label,
                    'is_public' => $isPublic,
                ],
            );
        }
    }
}
