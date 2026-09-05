<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Models\SystemBackup;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(private readonly BackupService $backups) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission(Permission::BackupManage), 403);

        $items = SystemBackup::query()
            ->with(['creator:id,name,email'])
            ->latest('id')
            ->paginate(min($request->integer('per_page', 15), 50));

        return response()->json([
            'data' => $items->getCollection()->map(fn (SystemBackup $b) => $this->serialize($b))->values(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission(Permission::BackupManage), 403);

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $backup = $this->backups->create($request->user(), $validated['notes'] ?? null);

        return response()->json([
            'message' => 'Sauvegarde créée avec succès.',
            'data' => $this->serialize($backup),
        ], 201);
    }

    public function download(Request $request, SystemBackup $backup): BinaryFileResponse
    {
        abort_unless($request->user()->hasPermission(Permission::BackupManage), 403);
        abort_unless($backup->status === 'ready', 422, 'Cette sauvegarde n\'est pas téléchargeable.');

        $path = $this->backups->absolutePath($backup);
        abort_unless(File::exists($path), 404, 'Fichier de sauvegarde introuvable.');

        return response()->download($path, $backup->filename, [
            'Content-Type' => 'application/zip',
        ]);
    }

    public function destroy(Request $request, SystemBackup $backup): JsonResponse
    {
        abort_unless($request->user()->hasPermission(Permission::BackupManage), 403);
        $this->backups->delete($backup);

        return response()->json(['message' => 'Sauvegarde supprimée.']);
    }

    private function serialize(SystemBackup $b): array
    {
        return [
            'id' => $b->id,
            'code' => $b->code,
            'filename' => $b->filename,
            'format' => $b->format,
            'status' => $b->status,
            'size_bytes' => $b->size_bytes,
            'size_label' => $this->humanSize((int) $b->size_bytes),
            'checksum' => $b->checksum,
            'tables_count' => $b->tables_count,
            'rows_count' => $b->rows_count,
            'notes' => $b->notes,
            'created_by' => $b->creator?->name,
            'created_at' => $b->created_at?->toIso8601String(),
        ];
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' o';
        }
        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' Ko';
        }

        return round($bytes / (1024 * 1024), 2).' Mo';
    }
}
