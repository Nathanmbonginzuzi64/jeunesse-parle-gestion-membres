<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Models\TrashItem;
use App\Services\TrashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrashController extends Controller
{
    public function __construct(private readonly TrashService $trash) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasPermission(Permission::TrashView) || $this->trash->isSuperAdmin($user),
            403
        );

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'module' => ['nullable', 'string', 'max:60'],
            'scope' => ['nullable', 'in:mine,all'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = TrashItem::query()
            ->active()
            ->with(['deleter:id,name,email'])
            ->latest('id');

        $wantAll = ($filters['scope'] ?? null) === 'all' || $this->trash->isSuperAdmin($user);
        if ($wantAll && ($this->trash->isSuperAdmin($user) || $user->hasPermission(Permission::TrashManage))) {
            // SuperAdmin / trash.manage : toute la corbeille
        } else {
            $query->where('deleted_by', $user->id);
        }

        if (! empty($filters['module'])) {
            $query->where('module', $filters['module']);
        }
        if (! empty($filters['q'])) {
            $q = $filters['q'];
            $query->where(function ($sub) use ($q) {
                $sub->where('label', 'like', "%{$q}%")
                    ->orWhere('deleted_by_name', 'like', "%{$q}%")
                    ->orWhere('module', 'like', "%{$q}%");
            });
        }

        $page = $query->paginate(min((int) ($filters['per_page'] ?? 20), 100));

        return response()->json([
            'data' => $page->getCollection()->map(fn (TrashItem $item) => $this->serialize($item))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'modules' => TrashItem::query()->active()->distinct()->orderBy('module')->pluck('module'),
        ]);
    }

    public function restore(Request $request, TrashItem $trashItem): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasPermission(Permission::TrashManage)
            || $user->hasPermission(Permission::TrashView)
            || $this->trash->isSuperAdmin($user),
            403
        );

        $model = $this->trash->restore($trashItem, $user);

        return response()->json([
            'message' => 'Élément restauré avec succès.',
            'data' => $this->serialize($trashItem->fresh(['deleter:id,name,email'])),
            'restored_id' => $model->getKey(),
        ]);
    }

    public function destroy(Request $request, TrashItem $trashItem): JsonResponse
    {
        $this->trash->purge($trashItem, $request->user());

        return response()->json(['message' => 'Élément définitivement supprimé.']);
    }

    private function serialize(TrashItem $item): array
    {
        return [
            'id' => $item->id,
            'module' => $item->module,
            'label' => $item->label,
            'subject_type' => class_basename($item->subject_type),
            'subject_id' => $item->subject_id,
            'deleted_by' => $item->deleted_by,
            'deleted_by_name' => $item->deleted_by_name ?? $item->deleter?->name,
            'created_at' => $item->created_at?->toIso8601String(),
            'payload' => $item->payload,
        ];
    }
}
