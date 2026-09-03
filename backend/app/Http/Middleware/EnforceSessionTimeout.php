<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/** Expire les jetons Sanctum selon security.session_timeout_minutes. */
class EnforceSessionTimeout
{
    public function handle(Request $request, Closure $next): Response
    {
        $minutes = (int) Setting::get('security.session_timeout_minutes', 0);

        if ($minutes <= 0) {
            return $next($request);
        }

        $user = $request->user();
        $token = $user?->currentAccessToken();

        if (! $token instanceof PersonalAccessToken) {
            return $next($request);
        }

        $reference = $token->last_used_at ?? $token->created_at;

        if ($reference && $reference->lt(now()->subMinutes($minutes))) {
            $token->delete();

            return response()->json([
                'message' => 'Votre session a expiré. Veuillez vous reconnecter.',
            ], 401);
        }

        return $next($request);
    }
}
