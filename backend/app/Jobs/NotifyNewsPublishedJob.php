<?php

namespace App\Jobs;

use App\Enums\MemberStatus;
use App\Enums\NotificationType;
use App\Models\Member;
use App\Models\NewsPost;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyNewsPublishedJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public int $newsPostId,
        public ?int $authorUserId = null,
    ) {}

    public function handle(NotificationService $notifications): void
    {
        $post = NewsPost::find($this->newsPostId);
        if (! $post) {
            return;
        }

        $author = $this->authorUserId ? User::find($this->authorUserId) : null;

        Member::query()
            ->whereNotNull('user_id')
            ->where('status', MemberStatus::Active->value)
            ->chunkById(200, function ($members) use ($notifications, $post, $author) {
                $notifications->broadcastToMembers(
                    $members,
                    NotificationType::NewsPublished,
                    '📰 Nouvelle actualité',
                    "Jeunesse Parle vient de publier :\n« {$post->title} »",
                    ['news_post_id' => $post->id, 'action' => 'view_news'],
                    $author,
                );
            });
    }
}
