<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $notifications = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->when($request->boolean('unread_only'), fn ($q) => $q->unread())
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 100));

        return NotificationResource::collection($notifications);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => AppNotification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
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
}
