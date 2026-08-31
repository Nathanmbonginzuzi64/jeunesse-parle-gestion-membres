<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\AppNotification;
use App\Models\DeviceToken;
use App\Models\Member;
use App\Models\NotificationLog;
use App\Services\NotificationService;
use App\Enums\NotificationCategory;
use App\Enums\NotificationType;
use App\Enums\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'unread_only' => ['nullable', 'boolean'],
            'category' => ['nullable', 'string'],
            'type' => ['nullable', 'string', 'max:60'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $notifications = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->when($request->boolean('unread_only'), fn ($q) => $q->unread())
            ->when($validated['category'] ?? null, fn ($q, $category) => $q->where('category', $category))
            ->when($validated['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            ->latest()
            ->paginate(min((int) ($validated['per_page'] ?? 20), 100));

        return NotificationResource::collection($notifications);
    }

    public function since(Request $request): JsonResponse
    {
        $since = $request->filled('since')
            ? Carbon::parse($request->string('since'))
            : now()->subMinutes(5);

        $userId = $request->user()->id;

        $newItems = AppNotification::query()
            ->where('user_id', $userId)
            ->where('created_at', '>', $since)
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'since' => $since->toIso8601String(),
            'has_new' => $newItems->isNotEmpty(),
            'unread_count' => AppNotification::where('user_id', $userId)->unread()->count(),
            'notifications' => NotificationResource::collection($newItems),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => AppNotification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission(Permission::NotificationsSend), 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['nullable', 'string', 'max:5000'],
            'level' => ['nullable', 'string', 'in:info,success,warning,danger'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'member_id' => ['nullable', 'integer', 'exists:members,id'],
        ]);

        $targetUser = isset($validated['user_id'])
            ? $request->user()->newQuery()->find($validated['user_id'])
            : null;

        $member = isset($validated['member_id'])
            ? Member::find($validated['member_id'])
            : null;

        if ($member && ! $targetUser && $member->user_id) {
            $targetUser = $member->user;
        }

        abort_unless($targetUser, 422, 'Destinataire introuvable ou sans compte portail.');

        $notification = $this->notifications->pushToUser(
            $targetUser,
            NotificationType::Manual,
            $validated['title'],
            $validated['body'] ?? null,
            [],
            $validated['level'] ?? 'info',
            $member,
            $request->user(),
        );

        return response()->json([
            'message' => 'Notification envoyée.',
            'data' => new NotificationResource($notification),
        ], 201);
    }

    public function stats(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission(Permission::StatisticsView), 403);

        $from = now()->subDays(30);

        $total = AppNotification::where('created_at', '>=', $from)->count();
        $read = AppNotification::where('created_at', '>=', $from)->whereNotNull('read_at')->count();

        $byType = AppNotification::query()
            ->where('created_at', '>=', $from)
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $byDay = AppNotification::query()
            ->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $activeUsers = AppNotification::query()
            ->where('created_at', '>=', $from)
            ->distinct('user_id')
            ->count('user_id');

        return response()->json([
            'summary' => [
                'sent' => $total,
                'read' => $read,
                'read_rate' => $total > 0 ? round(($read / $total) * 100, 1) : 0,
                'active_users' => $activeUsers,
            ],
            'by_type' => $byType,
            'by_day' => $byDay,
            'logs' => NotificationLog::query()
                ->latest()
                ->limit(20)
                ->get(['id', 'type', 'channel', 'status', 'recipient_label', 'sent_at', 'created_at']),
        ]);
    }

    public function registerDevice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', 'string', 'in:android,ios,web'],
            'device_name' => ['nullable', 'string', 'max:120'],
        ]);

        DeviceToken::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'token' => $validated['token'],
            ],
            [
                'platform' => $validated['platform'],
                'device_name' => $validated['device_name'] ?? null,
                'last_used_at' => now(),
            ],
        );

        return response()->json(['message' => 'Appareil enregistré pour les notifications push.']);
    }

    public function markAsRead(Request $request, AppNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404, 'Ressource introuvable.');

        $notification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $count = AppNotification::where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues.',
            'count' => $count,
        ]);
    }

    public function destroy(Request $request, AppNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404, 'Ressource introuvable.');

        $notification->delete();

        return response()->json(['message' => 'Notification supprimée.']);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => collect(NotificationCategory::cases())->map(fn (NotificationCategory $c) => [
                'id' => $c->value,
                'label' => $c->label(),
            ]),
        ]);
    }
}
