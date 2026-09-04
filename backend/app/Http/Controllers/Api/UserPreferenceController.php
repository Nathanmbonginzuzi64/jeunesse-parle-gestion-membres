<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPreference;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserPreferenceController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function show(Request $request): JsonResponse
    {
        $prefs = UserPreference::defaultsFor($request->user());

        return response()->json(['data' => $this->format($prefs)]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'who_can_contact' => ['sometimes', Rule::in(['authorized', 'structure', 'leaders', 'admin', 'nobody'])],
            'read_receipts' => ['sometimes', 'boolean'],
            'show_online' => ['sometimes', 'boolean'],
            'show_last_seen' => ['sometimes', 'boolean'],
            'photo_visibility' => ['sometimes', Rule::in(['everyone', 'contacts', 'private'])],
            'phone_visibility' => ['sometimes', Rule::in(['everyone', 'contacts', 'private'])],
            'email_visibility' => ['sometimes', Rule::in(['everyone', 'contacts', 'private'])],
            'theme' => ['sometimes', Rule::in(['light', 'dark', 'system'])],
            'locale' => ['sometimes', Rule::in(['fr', 'ln', 'en'])],
            'reduce_motion' => ['sometimes', 'boolean'],
            'auto_download_media' => ['sometimes', 'boolean'],
            'wifi_only_downloads' => ['sometimes', 'boolean'],
        ]);

        // Confidentialité stricte côté plateforme : téléphone/email ne peuvent pas être « everyone ».
        foreach (['phone_visibility', 'email_visibility'] as $field) {
            if (($validated[$field] ?? null) === 'everyone') {
                $validated[$field] = 'contacts';
            }
        }

        $prefs = UserPreference::defaultsFor($request->user());
        $prefs->fill($validated);
        $prefs->save();

        $this->audit->log('user.preferences-updated', $request->user(), 'Mise à jour des préférences personnelles');

        return response()->json([
            'message' => 'Préférences enregistrées.',
            'data' => $this->format($prefs->fresh()),
        ]);
    }

    private function format(UserPreference $prefs): array
    {
        return [
            'who_can_contact' => $prefs->who_can_contact,
            'read_receipts' => $prefs->read_receipts,
            'show_online' => $prefs->show_online,
            'show_last_seen' => $prefs->show_last_seen,
            'photo_visibility' => $prefs->photo_visibility,
            'phone_visibility' => $prefs->phone_visibility,
            'email_visibility' => $prefs->email_visibility,
            'theme' => $prefs->theme,
            'locale' => $prefs->locale,
            'reduce_motion' => $prefs->reduce_motion,
            'auto_download_media' => $prefs->auto_download_media,
            'wifi_only_downloads' => $prefs->wifi_only_downloads,
        ];
    }
}
