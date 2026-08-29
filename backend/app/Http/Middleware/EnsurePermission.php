<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Barrière d'autorisation appliquée au niveau de la route.
 * Les policies affinent ensuite l'accès objet par objet.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Authentification requise.'], 401);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Votre compte est désactivé.'], 403);
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => "Vous n'avez pas l'autorisation d'effectuer cette action.",
        ], 403);
    }
}
