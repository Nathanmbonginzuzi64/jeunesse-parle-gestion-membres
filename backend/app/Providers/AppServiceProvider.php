<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $base = rtrim((string) config('jeunesse.verification_base_url'), '/');
            $email = urlencode((string) $notifiable->getEmailForPasswordReset());

            return $base.'/reinitialiser-mot-de-passe?token='.$token.'&email='.$email;
        });
    }
}
