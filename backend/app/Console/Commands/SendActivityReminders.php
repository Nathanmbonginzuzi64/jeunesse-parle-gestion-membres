<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\Member;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendActivityReminders extends Command
{
    protected $signature = 'notifications:activity-reminders';

    protected $description = 'Envoie les rappels automatiques 24h et 1h avant les activités';

    public function handle(NotificationService $notifications): int
    {
        $this->sendWindow($notifications, 24, '24h');
        $this->sendWindow($notifications, 1, '1h');

        return self::SUCCESS;
    }

    private function sendWindow(NotificationService $notifications, int $hours, string $window): void
    {
        $from = now()->addHours($hours)->subMinutes(15);
        $to = now()->addHours($hours)->addMinutes(15);

        $activities = Activity::query()
            ->whereBetween('starts_at', [$from, $to])
            ->with('members')
            ->get();

        foreach ($activities as $activity) {
            foreach ($activity->members as $member) {
                if (! $member->user_id) {
                    continue;
                }

                $notifications->activityReminder($member, $activity, $window);
            }
        }

        $this->info("Rappels {$window} : {$activities->count()} activité(s) traitée(s).");
    }
}
