<?php

namespace App\Http\Middleware;

use App\Enums\RoleSlug;
use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque l'API authentifiée hors super-admin lorsque la maintenance est active.
 * Les routes publiques (auth login, références, etc.) restent hors de ce middleware.
 */
class EnsureNotInMaintenance
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Setting::get('maintenance', false)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && $user->hasRole(RoleSlug::SuperAdmin)) {
            return $next($request);
        }

        // Autoriser lecture / mise à jour du profil et déconnexion pendant la maintenance.
        if ($request->is('api/auth/me', 'api/auth/logout', 'api/auth/logout-all', 'api/settings')) {
            return $next($request);
        }

        return response()->json([
            'message' => 'La plateforme est en maintenance. Réessayez plus tard.',
        ], 503);
    }
}
