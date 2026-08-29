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
            'action' => ['nullable', 'string', 'max:60'],
            'user_id' => ['nullable', 'integer'],
            'subject_type' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->with('user:id,name')
            ->when($filters['action'] ?? null, fn (Builder $q, $v) => $q->where('action', 'like', $v.'%'))
            ->when($filters['user_id'] ?? null, fn (Builder $q, $v) => $q->where('user_id', $v))
            ->when($filters['subject_type'] ?? null, fn (Builder $q, $v) => $q->where('auditable_type', 'like', '%'.$v))
            ->when($filters['from'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '>=', $v))
            ->when($filters['to'] ?? null, fn (Builder $q, $v) => $q->whereDate('created_at', '<=', $v))
            ->latest()
            ->paginate(min((int) ($filters['per_page'] ?? 30), 100))
            ->withQueryString();

        return AuditLogResource::collection($logs);
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
