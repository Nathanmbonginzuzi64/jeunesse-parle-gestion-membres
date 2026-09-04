<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\EnsureNotInMaintenance;
use App\Http\Middleware\EnsurePermission;
use App\Http\Middleware\EnforceSessionTimeout;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule): void {
        $schedule->command('notifications:activity-reminders')->hourly();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'permission' => EnsurePermission::class,
            'account.active' => EnsureAccountIsActive::class,
            'maintenance' => EnsureNotInMaintenance::class,
            'session.timeout' => EnforceSessionTimeout::class,
        ]);

        $middleware->appendToGroup('api', [
            \App\Http\Middleware\PreventApiResponseCaching::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /*
         * Réponses JSON homogènes et sans fuite d'information : aucune trace
         * technique n'est renvoyée au client en dehors du mode debug.
         */
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->expectsJson() && ! $request->is('api/*')) {
                return null;
            }

            $payload = match (true) {
                $e instanceof ValidationException => [
                    'status' => 422,
                    'body' => [
                        'message' => 'Les données envoyées sont invalides.',
                        'errors' => $e->errors(),
                    ],
                ],
                $e instanceof AuthenticationException => [
                    'status' => 401,
                    'body' => ['message' => 'Authentification requise.'],
                ],
                $e instanceof AuthorizationException, $e instanceof AccessDeniedHttpException => [
                    'status' => 403,
                    'body' => [
                        'message' => (
                            $e->getMessage()
                            && ! str_contains(strtolower($e->getMessage()), 'unauthorized')
                            && $e->getMessage() !== 'This action is unauthorized.'
                        )
                            ? $e->getMessage()
                            : "Vous n'avez pas l'autorisation d'effectuer cette action.",
                    ],
                ],
                $e instanceof ModelNotFoundException, $e instanceof NotFoundHttpException => [
                    'status' => 404,
                    'body' => ['message' => 'Ressource introuvable.'],
                ],
                $e instanceof TooManyRequestsHttpException => [
                    'status' => 429,
                    'body' => ['message' => 'Trop de tentatives. Veuillez réessayer dans quelques instants.'],
                ],
                $e instanceof HttpExceptionInterface => [
                    'status' => $e->getStatusCode(),
                    'body' => [
                        'message' => (
                            $e->getMessage()
                            && ! str_contains(strtolower($e->getMessage()), 'unauthorized')
                        )
                            ? $e->getMessage()
                            : (
                                $e->getStatusCode() === 403
                                    ? "Vous n'avez pas l'autorisation d'effectuer cette action."
                                    : 'Une erreur est survenue.'
                            ),
                    ],
                ],
                default => [
                    'status' => 500,
                    'body' => ['message' => 'Une erreur est survenue. Veuillez réessayer.'],
                ],
            };

            if ($payload['status'] === 500 && config('app.debug')) {
                $payload['body']['debug'] = [
                    'exception' => $e::class,
                    'message' => $e->getMessage(),
                    'file' => $e->getFile().':'.$e->getLine(),
                ];
            }

            return response()->json($payload['body'], $payload['status']);
        });
    })->create();
