<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\VerificationLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
class AuditLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'action' => ['nullable', 'string', 'max:60'],
            'portal' => ['nullable', 'string', 'in:web,mobile,api,system'],
            'user_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'since_id' => ['nullable', 'integer', 'min:0'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->with(['user:id,name,email,role_id', 'user.role:id,name,slug'])
            ->when($filters['q'] ?? null, function (Builder $q, string $v) {
                $q->where(function (Builder $inner) use ($v) {
                    $inner->where('action', 'like', '%'.$v.'%')
                        ->orWhere('description', 'like', '%'.$v.'%')
                        ->orWhere('ip_address', 'like', '%'.$v.'%')
                        ->orWhere('portal', 'like', '%'.$v.'%')
                        ->orWhere('request_path', 'like', '%'.$v.'%')
                        ->orWhereHas('user', fn (Builder $u) => $u
                            ->where('name', 'like', '%'.$v.'%')
                            ->orWhere('email', 'like', '%'.$v.'%'));
                });
            })
            ->when($filters['action'] ?? null, fn (Builder $q, $v) => $q->where('action', 'like', $v.'%'))
            ->when($filters['portal'] ?? null, fn (Builder $q, $v) => $q->where('portal', $v))
            ->when($filters['user_id'] ?? null, fn (Builder $q, $v) => $q->where('user_id', $v))
            ->when($filters['subject_type'] ?? null, fn (Builder $q, $v) => $q->where('auditable_type', 'like', '%'.$v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '<=', $v))
            ->when(isset($filters['since_id']), fn (Builder $q) => $q->where('id', '>', (int) $filters['since_id']))
            ->latest('id')
            ->paginate(min((int) ($filters['per_page'] ?? 30), 100))
            ->withQueryString();

        return AuditLogResource::collection($logs);
    }

    /** Indicateurs globaux — tous utilisateurs, tous portails. */
    public function stats(): JsonResponse
    {
        $today = now()->toDateString();

        $byPortal = AuditLog::query()
            ->selectRaw("COALESCE(portal, 'unknown') as portal_key, COUNT(*) as total")
            ->groupBy('portal_key')
            ->pluck('total', 'portal_key');

        $last24h = AuditLog::query()
            ->where('created_at', '>=', now()->subDay())
            ->count();

        $todayCount = AuditLog::query()
            ->whereDate('created_at', $today)
            ->count();

        $latestId = (int) (AuditLog::query()->max('id') ?? 0);

        return response()->json([
            'data' => [
                'total' => AuditLog::query()->count(),
                'today' => $todayCount,
                'last_24h' => $last24h,
                'latest_id' => $latestId,
                'by_portal' => [
                    'web' => (int) ($byPortal['web'] ?? 0),
                    'mobile' => (int) ($byPortal['mobile'] ?? 0),
                    'api' => (int) ($byPortal['api'] ?? 0),
                    'system' => (int) ($byPortal['system'] ?? 0),
                    'unknown' => (int) ($byPortal['unknown'] ?? 0),
                ],
            ],
        ]);
    }

    public function verifications(Request $request): JsonResponse
    {
        $logs = VerificationLog::query()
            ->with(['member:id,member_code,last_name,first_name', 'verifier:id,name'])
            ->when($request->input('result'), fn (Builder $q, $v) => $q->where('result', $v))
            ->latest()
            ->paginate(min($request->integer('per_page', 30), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (VerificationLog $log) => [
                'id' => $log->id,
                'result' => $log->result,
                'context' => $log->context,
                'member' => $log->member ? [
                    'member_code' => $log->member->member_code,
                    'full_name' => $log->member->full_name,
                ] : null,
                'verified_by' => $log->verifier?->name,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
