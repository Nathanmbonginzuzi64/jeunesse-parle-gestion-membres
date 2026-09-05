<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class CreateSystemBackupCommand extends Command
{
    protected $signature = 'backup:create {--notes=}';

    protected $description = 'Crée une sauvegarde complète des données du système';

    public function handle(BackupService $backups): int
    {
        $this->info('Création de la sauvegarde…');
        $backup = $backups->create(null, $this->option('notes'));
        $this->info("OK {$backup->code} — {$backup->tables_count} tables, {$backup->rows_count} lignes ({$backup->filename})");

        return self::SUCCESS;
    }
}
