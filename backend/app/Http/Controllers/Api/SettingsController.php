<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json($this->payload());
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization.name' => ['required', 'string', 'max:160'],
            'organization.country' => ['required', 'string', 'max:120'],
            'membership.minimum_age' => ['required', 'integer', 'min:10', 'max:30'],
            'membership.maximum_age' => ['required', 'integer', 'min:18', 'max:80'],
            'security.two_factor' => ['required', 'boolean'],
            'security.session_timeout_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
            'notifications.email' => ['required', 'boolean'],
            'notifications.sms' => ['required', 'boolean'],
            'notifications.push' => ['required', 'boolean'],
            'cards.duration_months' => ['required', 'integer', 'min:1', 'max:120'],
            'cards.template' => ['required', 'string', 'max:40'],
            'maintenance' => ['required', 'boolean'],
        ]);

        abort_unless(
            $validated['membership']['maximum_age'] >= $validated['membership']['minimum_age'],
            422,
            'L\'âge maximum doit être supérieur ou égal à l\'âge minimum.',
        );

        Setting::put('organization.name', $validated['organization']['name'], 'string', 'organisation', 'Nom de l\'organisation');
        Setting::put('organization.country', $validated['organization']['country'], 'string', 'organisation', 'Pays');
        Setting::put('membership.minimum_age', $validated['membership']['minimum_age'], 'integer', 'adhesion', 'Âge minimum');
        Setting::put('membership.maximum_age', $validated['membership']['maximum_age'], 'integer', 'adhesion', 'Âge maximum');
        Setting::put('security.two_factor', $validated['security']['two_factor'], 'boolean', 'securite', '2FA');
        Setting::put('security.session_timeout_minutes', $validated['security']['session_timeout_minutes'], 'integer', 'securite', 'Expiration de session');
        Setting::put('notifications.email', $validated['notifications']['email'], 'boolean', 'notifications', 'E-mail');
        Setting::put('notifications.sms', $validated['notifications']['sms'], 'boolean', 'notifications', 'SMS');
        Setting::put('notifications.push', $validated['notifications']['push'], 'boolean', 'notifications', 'Push');
        Setting::put('card.validity_months', $validated['cards']['duration_months'], 'integer', 'carte', 'Durée (mois)');
        Setting::put('card.validity_years', max(1, (int) round($validated['cards']['duration_months'] / 12)), 'integer', 'carte', 'Durée (années)');
        Setting::put('card.template_version', $validated['cards']['template'], 'string', 'carte', 'Gabarit');
        Setting::put('maintenance', $validated['maintenance'], 'boolean', 'systeme', 'Maintenance');

        $this->audit->log('settings.updated', null, 'Mise à jour des paramètres plateforme');

        return response()->json([
            'message' => 'Paramètres enregistrés.',
            ...$this->payload(),
        ]);
    }

    private function payload(): array
    {
        $years = (int) Setting::get('card.validity_years', (int) config('jeunesse.card_validity_years', 3));
        $months = (int) Setting::get('card.validity_months', $years * 12);

        return [
            'organization' => [
                'name' => (string) Setting::get('organization.name', config('jeunesse.organization.name')),
                'country' => (string) Setting::get('organization.country', config('jeunesse.organization.country')),
            ],
            'membership' => [
                'minimum_age' => (int) Setting::get('membership.minimum_age', config('jeunesse.minimum_age')),
                'maximum_age' => (int) Setting::get('membership.maximum_age', config('jeunesse.maximum_age')),
            ],
            'security' => [
                'two_factor' => (bool) Setting::get('security.two_factor', false),
                'session_timeout_minutes' => (int) Setting::get('security.session_timeout_minutes', 120),
            ],
            'notifications' => [
                'email' => (bool) Setting::get('notifications.email', true),
                'sms' => (bool) Setting::get('notifications.sms', false),
                'push' => (bool) Setting::get('notifications.push', true),
            ],
            'cards' => [
                'duration_months' => $months,
                'template' => (string) Setting::get('card.template_version', config('jeunesse.card_template_version', 'v1')),
            ],
            'maintenance' => (bool) Setting::get('maintenance', false),
        ];
    }
}
