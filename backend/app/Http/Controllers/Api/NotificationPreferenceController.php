<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $prefs = NotificationPreference::defaultsFor($request->user());

        return response()->json(['data' => $this->format($prefs)]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'activity' => ['sometimes', 'boolean'],
            'news' => ['sometimes', 'boolean'],
            'message' => ['sometimes', 'boolean'],
            'presence' => ['sometimes', 'boolean'],
            'security' => ['sometimes', 'boolean'],
            'promotion' => ['sometimes', 'boolean'],
            'reminder' => ['sometimes', 'boolean'],
            'push_enabled' => ['sometimes', 'boolean'],
            'email_enabled' => ['sometimes', 'boolean'],
        ]);

        $prefs = NotificationPreference::defaultsFor($request->user());
        $prefs->update($validated);

        return response()->json([
            'message' => 'Préférences enregistrées.',
            'data' => $this->format($prefs->fresh()),
        ]);
    }

    private function format(NotificationPreference $prefs): array
    {
        return [
            'activity' => $prefs->activity,
            'news' => $prefs->news,
            'message' => $prefs->message,
            'presence' => $prefs->presence,
            'security' => $prefs->security,
            'promotion' => $prefs->promotion,
            'reminder' => $prefs->reminder,
            'push_enabled' => $prefs->push_enabled,
            'email_enabled' => $prefs->email_enabled,
        ];
    }
}
