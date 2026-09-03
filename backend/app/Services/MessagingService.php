<?php

namespace App\Services;

use App\Enums\NotificationType;
use App\Models\ChatAttachment;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatParticipant;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class MessagingService
{
    public function __construct(
        private readonly ChatDirectoryService $directory,
        private readonly ChatMediaStorageService $media,
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    public function findOrCreateDirect(User $actor, User $target): ChatConversation
    {
        abort_unless($this->directory->canContact($actor, $target), 403, 'Vous ne pouvez pas contacter cette personne.');

        $ids = [$actor->id, $target->id];
        sort($ids);
        $pairKey = $ids[0].'-'.$ids[1];

        $existing = ChatConversation::query()->where('pair_key', $pairKey)->first();
        if ($existing) {
            return $existing->load(['participants.user.role', 'participants.user.member']);
        }

        return DB::transaction(function () use ($actor, $target, $pairKey) {
            $conversation = ChatConversation::create([
                'type' => 'direct',
                'pair_key' => $pairKey,
                'created_by' => $actor->id,
            ]);

            $conversation->participants()->createMany([
                ['user_id' => $actor->id, 'role' => 'member', 'last_read_at' => now()],
                ['user_id' => $target->id, 'role' => 'member'],
            ]);

            $this->audit->log('chat.created', $conversation, "Conversation {$actor->id} ↔ {$target->id}");

            return $conversation->load(['participants.user.role', 'participants.user.member']);
        });
    }

    public function send(ChatConversation $conversation, User $actor, ?string $body, ?UploadedFile $file = null): ChatMessage
    {
        $body = trim((string) $body);
        abort_unless($body !== '' || $file, 422, 'Écrivez un message ou joignez un fichier.');

        $type = 'text';
        $stored = null;
        if ($file) {
            $stored = $this->media->store($file);
            $type = $stored['kind'] === 'image' ? 'image' : ($stored['kind'] === 'audio' ? 'audio' : 'file');
        }

        $message = DB::transaction(function () use ($conversation, $actor, $body, $type, $stored) {
            $message = ChatMessage::create([
                'conversation_id' => $conversation->id,
                'user_id' => $actor->id,
                'type' => $type,
                'body' => $body !== '' ? $body : null,
            ]);

            if ($stored) {
                ChatAttachment::create([
                    'message_id' => $message->id,
                    ...$stored,
                ]);
            }

            $preview = $body !== '' ? $body : match ($type) {
                'image' => '📷 Photo',
                'audio' => '🎤 Message vocal',
                default => '📎 Pièce jointe',
            };

            $conversation->update([
                'last_message_at' => now(),
                'last_message_preview' => mb_substr($preview, 0, 180),
            ]);

            ChatParticipant::query()
                ->where('conversation_id', $conversation->id)
                ->where('user_id', $actor->id)
                ->update(['last_read_at' => now()]);

            return $message->load(['author.member', 'attachments']);
        });

        $previewText = $conversation->fresh()?->last_message_preview ?? 'Nouveau message';
        $actor->loadMissing('member');

        foreach ($conversation->participants()->where('user_id', '!=', $actor->id)->with('user')->get() as $row) {
            if ($row->user) {
                $this->notifications->pushToUser(
                    $row->user,
                    NotificationType::ChatMessage,
                    '💬 Nouveau message',
                    ($actor->member?->full_name ?? $actor->name).' vous a écrit.',
                    [
                        'conversation_id' => $conversation->id,
                        'action' => 'view_chat',
                    ],
                    'info',
                    $actor->member,
                    $actor,
                );
            }
        }

        $this->audit->log('chat.message-sent', $conversation, $previewText);

        return $message;
    }

    public function markRead(ChatConversation $conversation, User $user): void
    {
        ChatParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return ChatParticipant::query()
            ->where('jp_chat_participants.user_id', $user->id)
            ->whereExists(function ($query) use ($user) {
                $query->selectRaw('1')
                    ->from('jp_chat_messages')
                    ->whereColumn('jp_chat_messages.conversation_id', 'jp_chat_participants.conversation_id')
                    ->where('jp_chat_messages.user_id', '!=', $user->id)
                    ->whereNull('jp_chat_messages.deleted_at')
                    ->where(function ($inner) {
                        $inner->whereNull('jp_chat_participants.last_read_at')
                            ->orWhereColumn('jp_chat_messages.created_at', '>', 'jp_chat_participants.last_read_at');
                    });
            })
            ->count();
    }

    public function conversationIsUnread(ChatConversation $conversation, User $user): bool
    {
        $participant = $conversation->participants->firstWhere('user_id', $user->id)
            ?? $conversation->participants()->where('user_id', $user->id)->first();

        $lastRead = $participant?->last_read_at;

        return ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $user->id)
            ->when($lastRead, fn ($q) => $q->where('created_at', '>', $lastRead), fn ($q) => $q)
            ->exists();
    }
}
