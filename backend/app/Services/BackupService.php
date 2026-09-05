<?php

namespace App\Services;

use App\Models\SystemBackup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ZipArchive;

class BackupService
{
    /** Tables système / sessions à exclure du dump métier. */
    private const SKIP_TABLES = [
        'migrations',
        'password_reset_tokens',
        'personal_access_tokens',
        'failed_jobs',
        'jobs',
        'job_batches',
        'cache',
        'cache_locks',
        'sessions',
    ];

    public function create(?User $actor = null, ?string $notes = null): SystemBackup
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        $code = 'BK-'.now()->format('Ymd-His').'-'.Str::upper(Str::random(4));
        $filename = $code.'.zip';
        $zipPath = $dir.DIRECTORY_SEPARATOR.$filename;

        $backup = SystemBackup::query()->create([
            'code' => $code,
            'filename' => $filename,
            'disk_path' => 'backups/'.$filename,
            'format' => 'json-zip',
            'status' => 'processing',
            'notes' => $notes,
            'created_by' => $actor?->id,
        ]);

        try {
            $tables = $this->listTables();
            $manifest = [
                'code' => $code,
                'created_at' => now()->toIso8601String(),
                'app' => config('app.name'),
                'tables' => [],
            ];
            $totalRows = 0;
            $tmpDir = storage_path('app/backups/_tmp_'.$code);
            File::ensureDirectoryExists($tmpDir);

            foreach ($tables as $table) {
                $rows = DB::table($table)->orderBy($this->orderColumn($table))->get()->map(fn ($r) => (array) $r)->all();
                $totalRows += count($rows);
                $manifest['tables'][$table] = count($rows);
                File::put(
                    $tmpDir.DIRECTORY_SEPARATOR.$table.'.json',
                    json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
                );
            }

            File::put(
                $tmpDir.DIRECTORY_SEPARATOR.'manifest.json',
                json_encode($manifest, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            );

            $zip = new ZipArchive;
            abort_unless($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, 500, 'Impossible de créer l\'archive.');

            foreach (File::files($tmpDir) as $file) {
                $zip->addFile($file->getPathname(), $file->getFilename());
            }
            $zip->close();
            File::deleteDirectory($tmpDir);

            $size = File::size($zipPath);
            $checksum = hash_file('sha256', $zipPath);

            $backup->update([
                'status' => 'ready',
                'size_bytes' => $size,
                'checksum' => $checksum,
                'tables_count' => count($tables),
                'rows_count' => $totalRows,
                'meta' => ['tables' => array_keys($manifest['tables'])],
            ]);

            app(AuditLogger::class)->log(
                'backup.created',
                $backup,
                "Sauvegarde système {$code} ({$backup->tables_count} tables, {$totalRows} lignes)"
            );

            return $backup->fresh(['creator:id,name,email']);
        } catch (\Throwable $e) {
            $backup->update(['status' => 'failed', 'notes' => trim(($notes ? $notes."\n" : '').$e->getMessage())]);
            if (File::exists($zipPath)) {
                File::delete($zipPath);
            }
            throw $e;
        }
    }

    public function absolutePath(SystemBackup $backup): string
    {
        return storage_path('app/'.$backup->disk_path);
    }

    public function delete(SystemBackup $backup): void
    {
        $path = $this->absolutePath($backup);
        if (File::exists($path)) {
            File::delete($path);
        }
        $backup->delete();
        app(AuditLogger::class)->log('backup.deleted', null, "Sauvegarde {$backup->code} supprimée");
    }

    /** @return list<string> */
    private function listTables(): array
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            $db = DB::getDatabaseName();
            $rows = DB::select('SHOW TABLES');
            $key = 'Tables_in_'.$db;
            $tables = collect($rows)->map(fn ($r) => $r->$key)->all();
        } elseif ($driver === 'sqlite') {
            $tables = collect(DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
                ->pluck('name')
                ->all();
        } else {
            $tables = collect(Schema::getTables())->pluck('name')->all();
        }

        return array_values(array_filter(
            $tables,
            fn ($t) => ! in_array($t, self::SKIP_TABLES, true) && $t !== 'system_backups'
        ));
    }

    private function orderColumn(string $table): string
    {
        if (Schema::hasColumn($table, 'id')) {
            return 'id';
        }

        $cols = Schema::getColumnListing($table);

        return $cols[0] ?? 'id';
    }
}
