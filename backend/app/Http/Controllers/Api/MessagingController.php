<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\User;
use App\Services\ChatDirectoryService;
use App\Services\MessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessagingController extends Controller
{
    public function __construct(
        private readonly MessagingService $messaging,
        private readonly ChatDirectoryService $directory,
    ) {}

    public function directory(Request $request): JsonResponse
    {
        $paginator = $this->directory->paginatedContacts(
            $request->user(),
            $request->string('q')->toString() ?: null,
            $request->integer('per_page', 20),
        );

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'count' => $this->messaging->unreadCount($request->user()),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $oversee = $user->hasRole(RoleSlug::SuperAdmin);
        $kind = $request->string('kind')->toString();

        $query = ChatConversation::query()
            ->with(['participants.user.role', 'participants.user.member', 'participants.user.province', 'participants.user.structure'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');

        if (! $oversee) {
            $query->whereHas('participants', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($kind === 'chef_membre') {
            $query->whereHas('participants.user.role', fn ($q) => $q->where('scope_level', '>=', 4))
                ->whereHas('participants.user.role', fn ($q) => $q->where('scope_level', '<', 4));
        } elseif ($kind === 'mine') {
            $query->whereHas('participants', fn ($q) => $q->where('user_id', $user->id));
        }

        $conversations = $query->paginate(min($request->integer('per_page', 40), 80));

        return response()->json([
            'data' => $conversations->getCollection()->map(fn (ChatConversation $c) => $this->formatConversation($c, $user, $oversee)),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
                'oversight' => $oversee,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::query()->with(['role', 'member'])->findOrFail($validated['user_id']);
        $conversation = $this->messaging->findOrCreateDirect($request->user(), $target);

        return response()->json([
            'message' => 'Conversation ouverte.',
            'data' => $this->formatConversation($conversation, $request->user(), $request->user()->hasRole(RoleSlug::SuperAdmin)),
        ], 201);
    }

    public function show(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $conversation->load(['participants.user.role', 'participants.user.member', 'participants.user.province', 'participants.user.structure']);

        return response()->json([
            'data' => $this->formatConversation($conversation, $request->user(), $request->user()->hasRole(RoleSlug::SuperAdmin)),
        ]);
    }

    public function messages(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $query = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->with(['author.member', 'attachments'])
            ->orderByDesc('id');

        if ($request->filled('before')) {
            $query->where('id', '<', $request->integer('before'));
        }

        $messages = $query->limit(40)->get()->reverse()->values();

        if ($conversation->hasParticipant((int) $request->user()->id)) {
            $this->messaging->markRead($conversation, $request->user());
        }

        return response()->json([
            'data' => $messages->map(fn (ChatMessage $m) => $this->formatMessage($m)),
            'meta' => [
                'can_send' => $conversation->hasParticipant((int) $request->user()->id),
                'oversight' => $request->user()->hasRole(RoleSlug::SuperAdmin)
                    && ! $conversation->hasParticipant((int) $request->user()->id),
            ],
        ]);
    }

    public function send(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorize('send', $conversation);

        $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'file' => [
                'nullable',
                'file',
                'max:'.(int) config('jeunesse.chat.max_kilobytes', 10240),
            ],
        ]);

        $message = $this->messaging->send(
            $conversation,
            $request->user(),
            $request->input('body'),
            $request->file('file'),
        );

        return response()->json([
            'message' => 'Message envoyé.',
            'data' => $this->formatMessage($message),
        ], 201);
    }

    public function read(Request $request, ChatConversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);
        if ($conversation->hasParticipant((int) $request->user()->id)) {
            $this->messaging->markRead($conversation, $request->user());
        }

        return response()->json(['message' => 'Lu.']);
    }

    private function formatConversation(ChatConversation $conversation, User $viewer, bool $oversee = false): array
    {
        $isParticipant = $conversation->hasParticipant((int) $viewer->id);
        $participants = $conversation->participants
            ->map(fn ($row) => $row->user ? $this->directory->serializeContact($row->user) : null)
            ->filter()
            ->values();

        $peer = $isParticipant
            ? $conversation->otherParticipant($viewer)
            : null;

        $kind = $this->directory->classifyExchange($conversation->participants);

        $title = null;
        if (! $isParticipant && $participants->count() >= 2) {
            $title = $participants->pluck('name')->take(2)->implode(' ↔ ');
        }

        return [
            'id' => $conversation->id,
            'channel' => 'chat',
            'type' => $conversation->type,
            'subject' => $conversation->subject,
            'title' => $title,
            'kind' => $kind,
            'oversight' => $oversee && ! $isParticipant,
            'can_send' => $isParticipant,
            'peer' => $peer ? $this->directory->serializeContact($peer) : ($participants->first() ?? null),
            'participants' => $participants,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'last_message_preview' => $conversation->last_message_preview,
            'unread' => $isParticipant ? $this->messaging->conversationIsUnread($conversation, $viewer) : false,
            'created_at' => $conversation->created_at?->toIso8601String(),
        ];
    }

    private function formatMessage(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'type' => $message->deleted_at ? 'deleted' : $message->type,
            'body' => $message->deleted_at ? null : $message->body,
            'author' => $message->author?->member?->full_name ?? $message->author?->name,
            'author_id' => $message->user_id,
            'photo_url' => $message->author?->photoUrl(),
            'created_at' => $message->created_at?->toIso8601String(),
            'edited_at' => $message->edited_at?->toIso8601String(),
            'attachments' => $message->deleted_at ? [] : $message->attachments->map(fn ($file) => [
                'id' => $file->id,
                'kind' => $file->kind,
                'name' => $file->original_name,
                'mime' => $file->mime,
                'size' => $file->size,
                'url' => $file->url(),
            ])->values(),
        ];
    }
}
