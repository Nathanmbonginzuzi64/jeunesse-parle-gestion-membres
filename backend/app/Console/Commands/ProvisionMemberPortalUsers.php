<?php

namespace App\Console\Commands;

use App\Models\Member;
use App\Services\MemberService;
use Illuminate\Console\Command;

class ProvisionMemberPortalUsers extends Command
{
    protected $signature = 'members:provision-portal-users {--password= : Mot de passe provisoire à appliquer}';

    protected $description = 'Crée un compte portail (rôle membre) pour chaque dossier sans utilisateur lié.';

    public function handle(MemberService $members): int
    {
        $password = (string) ($this->option('password') ?: env('JP_DEMO_PASSWORD', 'Password!2026'));

        if ($password === '') {
            $this->error('Fournissez --password ou définissez JP_DEMO_PASSWORD.');

            return self::FAILURE;
        }

        $query = Member::query()->whereNull('user_id');
        $total = $query->count();

        if ($total === 0) {
            $this->info('Tous les membres possèdent déjà un compte portail.');

            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $query->orderBy('id')->chunkById(50, function ($chunk) use ($members, $password, $bar) {
            foreach ($chunk as $member) {
                $members->provisionPortalUser($member, $password);
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);
        $this->info("{$total} compte(s) portail créé(s) avec le rôle membre.");

        return self::SUCCESS;
    }
}
