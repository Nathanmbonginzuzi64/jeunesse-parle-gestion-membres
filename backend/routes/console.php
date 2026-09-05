<?php

use App\Models\Member;
use App\Models\User;
use App\Services\BiometricService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('backup:create --notes="Sauvegarde automatique quotidienne"')
    ->dailyAt('02:30')
    ->withoutOverlapping();

Artisan::command('jp:seed-biometrics', function (BiometricService $biometrics) {
    $slots = BiometricService::REQUIRED_SLOTS;

    $makeHash = function (string $seed, string $slot): string {
        $input = "{$seed}:{$slot}";
        $hash = 0;
        $len = strlen($input);
        for ($i = 0; $i < $len; $i++) {
            $hash = (($hash << 5) - $hash) + ord($input[$i]);
            $hash = $hash & 0xFFFFFFFF;
            if ($hash > 0x7FFFFFFF) {
                $hash -= 0x100000000;
            }
        }

        return 'FP-'.str_replace('_', '-', $slot).'-'.strtoupper(str_pad(base_convert((string) abs($hash), 10, 36), 8, '0', STR_PAD_LEFT));
    };

    $emails = [
        'superadmin@jeunesseparle.test',
        'admin@jeunesseparle.test',
        'kinshasa@jeunesseparle.test',
        'nordkivu@jeunesseparle.test',
        'ville.kinshasa@jeunesseparle.test',
        'kintambo@jeunesseparle.test',
        'agent@jeunesseparle.test',
        'nathan@jeunesseparle.test',
    ];

    $users = User::whereIn('email', $emails)->get();

    foreach ($users as $user) {
        $seed = 'user-'.($user->email ?? $user->phone).'-'.$user->id;
        $fps = [];
        foreach ($slots as $slot) {
            $fps[] = [
                'slot' => $slot,
                'template_hash' => $makeHash($seed, $slot),
                'captured_at' => now()->toIso8601String(),
            ];
        }
        $biometrics->enrollForUser($user, $fps, $user);
        $this->info("User {$user->email} enrolled");
    }

    $members = Member::query()->whereHas('activeCard')->limit(20)->get();
    $author = $users->first();

    foreach ($members as $member) {
        $fps = [];
        foreach ($slots as $slot) {
            $fps[] = [
                'slot' => $slot,
                'template_hash' => $makeHash($member->member_code, $slot),
                'captured_at' => now()->toIso8601String(),
            ];
        }
        $biometrics->enrollForMember($member, $fps, $author);
    }

    $this->info('Members enrolled: '.$members->count());
})->purpose('Enrôle des empreintes de démonstration');
