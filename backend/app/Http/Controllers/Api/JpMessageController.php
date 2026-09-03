<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission as PermissionEnum;
use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\JpMessage;
use App\Models\JpMessageReply;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JpMessageController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = JpMessage::query()->with([
            'member:id,member_code,last_name,first_name,photo_path',
            'author:id,name,photo_path',
            'assignee:id,name',
        ]);

        if (! $user->hasPermission(PermissionEnum::UsersView) || $request->boolean('mine')) {
            $query->where(function ($inner) use ($user) {
                $inner->where('user_id', $user->id);
                if ($user->member_id) {
                    $inner->orWhere('member_id', $user->member_id);
                }
            });
        }

        $messages = $query->latest()->paginate(min($request->integer('per_page', 30), 80));

        return response()->json([
            'data' => $messages->getCollection()->map(fn (JpMessage $m) => $this->formatMessage($m)),
            'meta' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'category' => ['required', 'string', 'in:plainte,suggestion,doleance,demande,preoccupation'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $source = $user->member_id ? 'member' : 'staff';

        $message = JpMessage::create([
            ...$validated,
            'reference' => 'JP-MSG-'.str_pad((string) (JpMessage::withTrashed()->count() + 1), 6, '0', STR_PAD_LEFT),
            'user_id' => $user->id,
            'member_id' => $user->member_id,
            'source' => $source,
            'status' => 'open',
        ]);

        $this->audit->log('jp_message.created', $message, "Message {$message->reference} — {$user->name}");
        $this->notifications->jpMessageCreatedForAdmins($message);

        return response()->json([
            'message' => 'Conversation ouverte.',
            'data' => $this->formatMessage($message->load(['member', 'author'])),
        ], 201);
    }

    public function show(Request $request, JpMessage $jpMessage): JsonResponse
    {
        $this->authorizeMessage($request->user(), $jpMessage);

        $jpMessage->load([
            'member.province', 'member.commune', 'member.structure',
            'author', 'replies.user', 'replies.member', 'assignee',
        ]);

        if ($request->user()->hasPermission(PermissionEnum::UsersView) && ! $jpMessage->read_by_admin_at) {
            $jpMessage->update(['read_by_admin_at' => now()]);
        }

        return response()->json(['data' => $this->formatMessage($jpMessage, true)]);
    }

    public function reply(Request $request, JpMessage $jpMessage): JsonResponse
    {
        $user = $request->user();
        $this->authorizeMessage($user, $jpMessage);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $isAdmin = $user->hasPermission(PermissionEnum::UsersView);

        $reply = JpMessageReply::create([
            'jp_message_id' => $jpMessage->id,
            'user_id' => $user->id,
            'member_id' => $user->member_id,
            'body' => $validated['body'],
        ]);

        if ($isAdmin) {
            $jpMessage->update(['status' => 'in_progress']);
            $jpMessage->load('member');
            if ($jpMessage->member) {
                $this->notifications->jpMessageReplyReceived($jpMessage->member, $jpMessage);
            }
        }

        $this->audit->log('jp_message.replied', $jpMessage, "Réponse sur {$jpMessage->reference}");

        return response()->json([
            'message' => 'Réponse envoyée.',
            'data' => [
                'id' => $reply->id,
                'body' => $reply->body,
                'author' => $user->name,
                'is_admin' => $isAdmin,
                'created_at' => $reply->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    private function authorizeMessage(User $user, JpMessage $message): void
    {
        if ($user->hasPermission(PermissionEnum::UsersView)) {
            return;
        }

        if ((int) $message->user_id === (int) $user->id) {
            return;
        }

        abort_unless(
            $user->member_id && (int) $message->member_id === (int) $user->member_id,
            403,
        );
    }

    private function formatMessage(JpMessage $message, bool $detailed = false): array
    {
        $data = [
            'id' => $message->id,
            'reference' => $message->reference,
            'subject' => $message->subject,
            'category' => $message->category,
            'body' => $message->body,
            'status' => $message->status,
            'created_at' => $message->created_at?->toIso8601String(),
            'source' => $message->source ?? 'member',
            'guest_name' => $message->guest_name,
            'guest_email' => $message->guest_email,
            'author_label' => $message->member?->full_name
                ?? $message->author?->name
                ?? $message->guest_name
                ?? 'Utilisateur',
            'member' => $message->member ? [
                'member_code' => $message->member->member_code,
                'full_name' => $message->member->full_name,
                'photo_url' => $message->member->photo_path
                    ? route('media.member-photo', ['member' => $message->member->member_code])
                    : null,
                'province' => $message->member->province?->name,
                'commune' => $message->member->commune?->name,
                'structure' => $message->member->structure?->name,
            ] : null,
            'assigned_to' => $message->assignee?->name,
        ];

        if ($detailed) {
            $data['replies'] = $message->replies->map(fn (JpMessageReply $r) => [
                'id' => $r->id,
                'body' => $r->body,
                'author' => $r->user?->name ?? $r->member?->full_name ?? 'Utilisateur',
                'is_admin' => $r->user?->hasPermission(PermissionEnum::UsersView) ?? false,
                'created_at' => $r->created_at?->toIso8601String(),
                'read_at' => $r->read_at?->toIso8601String(),
            ])->values();
        }

        return $data;
    }
}
