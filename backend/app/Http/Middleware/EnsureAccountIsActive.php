<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && (! $user->is_active || $user->isLocked())) {
            // Révoque le jeton porteur ; les sessions de test utilisent un
            // TransientToken qui n'est pas persisté et n'a rien à supprimer.
            $token = $user->currentAccessToken();

            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            return response()->json([
                'message' => 'Votre compte est désactivé ou temporairement verrouillé.',
            ], 403);
        }

        return $next($request);
    }
}
