<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JpMessage;
use App\Models\JpMessageReply;
use App\Services\AuditLogger;
use App\Services\IdentifierGenerator;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JpMessageController extends Controller
{
    public function __construct(
        private readonly IdentifierGenerator $identifiers,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = JpMessage::query()->with(['member:id,member_code,last_name,first_name,photo_path', 'assignee:id,name']);

        if ($user->member_id && ! $user->hasPermission(\App\Enums\Permission::UsersView)) {
            $query->where('member_id', $user->member_id);
        }

        $messages = $query->latest()->paginate(min($request->integer('per_page', 20), 50));

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
        $member = $request->user()->member;
        abort_unless($member, 403, 'Seuls les membres peuvent envoyer un message.');

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:200'],
            'category' => ['required', 'string', 'in:plainte,suggestion,doleance,demande,preoccupation'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = JpMessage::create([
            ...$validated,
            'reference' => 'JP-MSG-'.str_pad((string) (JpMessage::count() + 1), 6, '0', STR_PAD_LEFT),
            'member_id' => $member->id,
            'source' => 'member',
            'status' => 'open',
        ]);

        $this->audit->log('jp_message.created', $message, "Message {$message->reference} — {$member->member_code}");

        $this->notifications->jpMessageCreatedForAdmins($message);

        return response()->json([
            'message' => 'Votre message a été envoyé.',
            'data' => $this->formatMessage($message->load('member')),
        ], 201);
    }

    public function show(Request $request, JpMessage $jpMessage): JsonResponse
    {
        $this->authorizeMessage($request, $jpMessage);

        $jpMessage->load(['member.province', 'member.commune', 'member.structure', 'replies.user', 'replies.member', 'assignee']);

        if ($request->user()->hasPermission(\App\Enums\Permission::UsersView) && ! $jpMessage->read_by_admin_at) {
            $jpMessage->update(['read_by_admin_at' => now()]);
        }

        return response()->json(['data' => $this->formatMessage($jpMessage, true)]);
    }

    public function reply(Request $request, JpMessage $jpMessage): JsonResponse
    {
        $this->authorizeMessage($request, $jpMessage);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $reply = JpMessageReply::create([
            'jp_message_id' => $jpMessage->id,
            'user_id' => $request->user()->member_id ? null : $request->user()->id,
            'member_id' => $request->user()->member_id,
            'body' => $validated['body'],
        ]);

        if ($request->user()->hasPermission(\App\Enums\Permission::UsersView)) {
            $jpMessage->update(['status' => 'in_progress']);
        }

        $this->audit->log('jp_message.replied', $jpMessage, "Réponse sur {$jpMessage->reference}");

        if ($request->user()->hasPermission(\App\Enums\Permission::UsersView)) {
            $jpMessage->load('member');
            if ($jpMessage->member) {
                $this->notifications->jpMessageReplyReceived($jpMessage->member, $jpMessage);
            }
        }

        return response()->json(['message' => 'Réponse envoyée.', 'data' => $reply], 201);
    }

    private function authorizeMessage(Request $request, JpMessage $message): void
    {
        $user = $request->user();
        if ($user->hasPermission(\App\Enums\Permission::UsersView)) {
            return;
        }
        abort_unless($user->member_id === $message->member_id, 403);
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
                ?? $message->guest_name
                ?? 'Visiteur',
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
                'author' => $r->user?->name ?? $r->member?->full_name,
                'is_admin' => $r->user_id !== null,
                'created_at' => $r->created_at?->toIso8601String(),
                'read_at' => $r->read_at?->toIso8601String(),
            ])->values();
        }

        return $data;
    }
}
