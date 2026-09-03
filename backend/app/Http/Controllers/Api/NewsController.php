<?php

namespace App\Http\Controllers\Api;

use App\Enums\NewsCategory;
use App\Http\Controllers\Controller;
use App\Jobs\NotifyNewsPublishedJob;
use App\Models\NewsComment;
use App\Models\NewsCommentLike;
use App\Models\NewsPost;
use App\Models\NewsReaction;
use App\Models\NewsShare;
use App\Models\NewsView;
use App\Services\AuditLogger;
use App\Services\NewsMediaStorageService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NewsController extends Controller
{
    private const REACTION_TYPES = ['like', 'love', 'support', 'important', 'celebrate', 'sad'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly NotificationService $notifications,
        private readonly NewsMediaStorageService $media,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = NewsPost::query()
            ->with(['author:id,name,role_id', 'author.role:id,name', 'activity:id,title,code,starts_at,location'])
            ->whereNull('deleted_at');

        if (! $this->canManage($request)) {
            $query->where('is_published', true);
        } elseif ($request->boolean('include_drafts')) {
            // Admin dashboard : inclut brouillons
        } else {
            $query->where('is_published', true);
        }

        if ($q = trim((string) $request->input('q', ''))) {
            $query->where(function ($builder) use ($q) {
                $builder->where('title', 'like', "%{$q}%")
                    ->orWhere('body', 'like', "%{$q}%");
            });
        }

        if ($category = $request->input('category')) {
            if (in_array($category, array_column(NewsCategory::cases(), 'value'), true)) {
                $query->where('category', $category);
            }
        }

        if ($request->filled('since')) {
            $query->where('created_at', '>', $request->input('since'));
        }

        $posts = $query->latest()->paginate(min($request->integer('per_page', 15), 50));

        $userId = $request->user()->id;
        $myReactions = NewsReaction::query()
            ->whereIn('news_post_id', $posts->getCollection()->pluck('id'))
            ->where('user_id', $userId)
            ->pluck('type', 'news_post_id');

        return response()->json([
            'data' => $posts->getCollection()->map(fn (NewsPost $post) => $this->formatPost(
                $post,
                $request->user()->member_id,
                myReaction: $myReactions[$post->id] ?? null,
                userId: $userId,
            )),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function manage(Request $request): JsonResponse
    {
        $this->authorize('manage', NewsPost::class);

        $query = NewsPost::query()
            ->withTrashed()
            ->with(['author:id,name', 'activity:id,title,code'])
            ->latest();

        if ($q = trim((string) $request->input('q', ''))) {
            $query->where('title', 'like', "%{$q}%");
        }

        if ($status = $request->input('status')) {
            match ($status) {
                'published' => $query->where('is_published', true)->whereNull('deleted_at'),
                'draft' => $query->where('is_published', false)->whereNull('deleted_at'),
                'archived' => $query->whereNotNull('deleted_at'),
                default => null,
            };
        }

        $posts = $query->paginate(min($request->integer('per_page', 20), 100));

        return response()->json([
            'data' => $posts->getCollection()->map(fn (NewsPost $post) => [
                ...$this->formatPost($post),
                'status' => $this->resolveStatus($post),
                'is_published' => $post->is_published,
            ]),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
            'summary' => [
                'total_posts' => NewsPost::withTrashed()->count(),
                'total_views' => (int) NewsPost::withTrashed()->sum('views_count'),
                'total_likes' => (int) NewsPost::withTrashed()->sum('likes_count'),
                'total_comments' => (int) NewsPost::withTrashed()->sum('comments_count'),
                'total_shares' => (int) NewsPost::withTrashed()->sum('shares_count'),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', NewsPost::class);

        $validated = $this->validatePost($request);

        $galleryPaths = [];
        if ($request->hasFile('gallery')) {
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->media->storeImage($file);
            }
        }

        $mediaPath = null;
        if ($request->hasFile('image')) {
            $mediaPath = $this->media->storeImage($request->file('image'));
            $validated['media_type'] = 'image';
        } elseif ($request->hasFile('video')) {
            $mediaPath = $this->media->storeVideo($request->file('video'));
            $validated['media_type'] = 'video';
        } elseif ($request->hasFile('document')) {
            $mediaPath = $this->media->storeDocument($request->file('document'));
            $validated['media_type'] = 'document';
        }

        $mediaType = $validated['media_type'] ?? 'text';

        $post = NewsPost::create([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'category' => $validated['category'] ?? NewsCategory::General->value,
            'media_type' => $mediaType,
            'media_path' => $mediaPath,
            'gallery_paths' => $galleryPaths ?: null,
            'external_url' => $this->resolveExternalUrl($validated, $mediaType),
            'activity_id' => $validated['activity_id'] ?? null,
            'author_id' => $request->user()->id,
            'is_published' => $validated['is_published'] ?? true,
        ]);

        $this->audit->log('news.created', $post, "Publication : {$post->title}");

        if ($post->is_published) {
            NotifyNewsPublishedJob::dispatch($post->id, $request->user()->id);
        }

        return response()->json([
            'message' => 'Actualité publiée.',
            'data' => $this->formatPost($post->load(['author.role', 'activity'])),
        ], 201);
    }

    public function update(Request $request, NewsPost $newsPost): JsonResponse
    {
        $this->authorize('update', $newsPost);

        $validated = $this->validatePost($request, updating: true);
        $wasPublished = $newsPost->is_published;

        if ($request->hasFile('image')) {
            $validated['media_path'] = $this->media->storeImage($request->file('image'), $newsPost->media_path);
            $validated['media_type'] = 'image';
        } elseif ($request->hasFile('video')) {
            $validated['media_path'] = $this->media->storeVideo($request->file('video'), $newsPost->media_path);
            $validated['media_type'] = 'video';
        } elseif ($request->hasFile('document')) {
            $validated['media_path'] = $this->media->storeDocument($request->file('document'), $newsPost->media_path);
            $validated['media_type'] = 'document';
        }

        if ($request->hasFile('gallery')) {
            $galleryPaths = $newsPost->gallery_paths ?? [];
            foreach ($request->file('gallery') as $file) {
                $galleryPaths[] = $this->media->storeImage($file);
            }
            $validated['gallery_paths'] = $galleryPaths;
        }

        $payload = [];
        foreach (['title', 'body', 'category', 'media_type', 'activity_id', 'is_published'] as $field) {
            if (array_key_exists($field, $validated)) {
                $payload[$field] = $validated[$field];
            }
        }

        $mediaType = $validated['media_type'] ?? $newsPost->media_type;
        if ($request->has('text_background') || array_key_exists('external_url', $validated)) {
            $payload['external_url'] = $this->resolveExternalUrl($validated, $mediaType, $newsPost->external_url);
        }
        if (isset($validated['media_path'])) {
            $payload['media_path'] = $validated['media_path'];
        }
        if (isset($validated['gallery_paths'])) {
            $payload['gallery_paths'] = $validated['gallery_paths'];
        }

        $newsPost->update($payload);

        if (! $wasPublished && $newsPost->is_published) {
            NotifyNewsPublishedJob::dispatch($newsPost->id, $request->user()->id);
        }

        $this->audit->log('news.updated', $newsPost, "Modification : {$newsPost->title}");

        return response()->json([
            'message' => 'Actualité mise à jour.',
            'data' => $this->formatPost($newsPost->fresh(['author.role', 'activity'])),
        ]);
    }

    public function destroy(Request $request, NewsPost $newsPost): JsonResponse
    {
        $this->authorize('delete', $newsPost);

        $newsPost->delete();
        $this->audit->log('news.deleted', $newsPost, "Suppression : {$newsPost->title}");

        return response()->json(['message' => 'Actualité archivée.']);
    }

    public function restore(Request $request, int $newsPost): JsonResponse
    {
        $post = NewsPost::withTrashed()->findOrFail($newsPost);
        $this->authorize('delete', $post);

        $post->restore();
        $this->audit->log('news.restored', $post, "Restauration : {$post->title}");

        return response()->json(['message' => 'Actualité restaurée.', 'data' => $this->formatPost($post)]);
    }

    public function react(Request $request, NewsPost $newsPost): JsonResponse
    {
        $user = $request->user();
        $member = $user->member;

        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:'.implode(',', self::REACTION_TYPES)],
            'remove' => ['nullable', 'boolean'],
        ]);

        if ($request->boolean('remove')) {
            NewsReaction::where('news_post_id', $newsPost->id)
                ->where('user_id', $user->id)
                ->delete();
        } else {
            NewsReaction::updateOrCreate(
                ['news_post_id' => $newsPost->id, 'user_id' => $user->id],
                [
                    'type' => $validated['type'] ?? 'like',
                    'member_id' => $member?->id,
                ],
            );

            if ($member) {
                $newsPost->load('author.member');
                if ($newsPost->author_id && $newsPost->author?->member_id && $newsPost->author->member_id !== $member->id) {
                    $authorMember = $newsPost->author->member;
                    if ($authorMember) {
                        $this->notifications->newsReactionReceived($authorMember, $newsPost, $member);
                    }
                }
            }
        }

        $newsPost->update(['likes_count' => $newsPost->reactions()->count()]);
        $counts = $this->reactionCounts($newsPost);

        return response()->json([
            'message' => $request->boolean('remove') ? 'Réaction retirée.' : 'Réaction enregistrée.',
            'likes_count' => $newsPost->likes_count,
            'reactions' => $counts,
            'my_reaction' => $request->boolean('remove') ? null : ($validated['type'] ?? 'like'),
        ]);
    }

    public function comment(Request $request, NewsPost $newsPost): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'parent_id' => ['nullable', 'integer', 'exists:news_comments,id'],
        ]);

        $comment = NewsComment::create([
            'news_post_id' => $newsPost->id,
            'member_id' => $request->user()->member_id,
            'user_id' => $request->user()->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'body' => $validated['body'],
        ]);

        $member = $request->user()->member;
        $newsPost->increment('comments_count');

        $newsPost->load('author.member');
        $postAuthor = $newsPost->author;
        if ($postAuthor?->member_id && $postAuthor->member_id !== $member?->id) {
            $recipient = $postAuthor->member;
            if ($recipient && $member) {
                $this->notifications->newsCommentReceived($recipient, $newsPost, $member);
            }
        }

        return response()->json([
            'message' => 'Commentaire publié.',
            'data' => $this->formatComment(
                $comment->load(['member:id,first_name,last_name', 'user:id,name']),
                userId: $request->user()->id,
            ),
        ], 201);
    }

    public function updateComment(Request $request, NewsComment $newsComment): JsonResponse
    {
        abort_unless(
            $newsComment->user_id === $request->user()->id
            || $this->canManage($request),
            403,
        );

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $newsComment->update(['body' => $validated['body']]);

        return response()->json([
            'message' => 'Commentaire modifié.',
            'data' => $this->formatComment(
                $newsComment->fresh(['member:id,first_name,last_name', 'user:id,name']),
                userId: $request->user()->id,
            ),
        ]);
    }

    public function likeComment(Request $request, NewsComment $newsComment): JsonResponse
    {
        $userId = $request->user()->id;
        $existing = NewsCommentLike::query()
            ->where('news_comment_id', $newsComment->id)
            ->where('user_id', $userId)
            ->first();

        if ($request->boolean('remove') || $existing) {
            if ($existing) {
                $existing->delete();
                if ($newsComment->likes_count > 0) {
                    $newsComment->decrement('likes_count');
                }
            }

            return response()->json([
                'message' => 'Like retiré.',
                'likes_count' => (int) $newsComment->fresh()->likes_count,
                'liked' => false,
            ]);
        }

        $like = NewsCommentLike::firstOrCreate([
            'news_comment_id' => $newsComment->id,
            'user_id' => $userId,
        ]);

        if ($like->wasRecentlyCreated) {
            $newsComment->increment('likes_count');
        }

        return response()->json([
            'message' => 'Commentaire aimé.',
            'likes_count' => (int) $newsComment->fresh()->likes_count,
            'liked' => true,
        ]);
    }

    public function deleteComment(Request $request, NewsComment $newsComment): JsonResponse
    {
        abort_unless(
            $newsComment->user_id === $request->user()->id
            || $this->canManage($request),
            403,
        );

        $post = $newsComment->newsPost;
        $newsComment->delete();
        $post?->decrement('comments_count');

        return response()->json(['message' => 'Commentaire supprimé.']);
    }

    public function show(Request $request, NewsPost $newsPost): JsonResponse
    {
        if (! $newsPost->is_published && ! $this->canManage($request)) {
            abort(404);
        }

        $this->recordView($request, $newsPost);

        $memberId = $request->user()->member_id;
        $userId = $request->user()->id;
        $newsPost->load([
            'author:id,name,role_id',
            'author.role:id,name',
            'activity:id,title,code,starts_at,ends_at,location',
            'comments' => fn ($q) => $q->whereNull('parent_id')
                ->with([
                    'member:id,first_name,last_name',
                    'user:id,name',
                    'likes' => fn ($l) => $l->where('user_id', $userId),
                    'replies' => fn ($r) => $r->with([
                        'member:id,first_name,last_name',
                        'user:id,name',
                        'likes' => fn ($l) => $l->where('user_id', $userId),
                    ])->latest(),
                ])
                ->latest()
                ->limit(100),
        ]);

        return response()->json(['data' => [
            ...$this->formatPost($newsPost, $memberId, detailed: true, userId: $userId),
            'comments' => $newsPost->comments->map(
                fn (NewsComment $c) => $this->formatComment($c, withReplies: true, userId: $userId),
            ),
        ]]);
    }

    public function share(Request $request, NewsPost $newsPost): JsonResponse
    {
        $validated = $request->validate([
            'channel' => ['nullable', 'string', 'in:in_app,copy_link,social'],
        ]);

        NewsShare::create([
            'news_post_id' => $newsPost->id,
            'member_id' => $request->user()->member_id,
            'user_id' => $request->user()->id,
            'channel' => $validated['channel'] ?? 'in_app',
        ]);

        $newsPost->increment('shares_count');

        $newsPost->load('author.member');
        $member = $request->user()->member;
        if ($newsPost->author?->member_id && $member && $newsPost->author->member_id !== $member->id) {
            // Partage notifie implicitement via engagement — optionnel
        }

        return response()->json([
            'message' => 'Partage enregistré.',
            'shares_count' => $newsPost->shares_count,
            'share_url' => url("/actualites/{$newsPost->id}"),
        ]);
    }

    public function stats(): JsonResponse
    {
        $topViewed = NewsPost::query()
            ->orderByDesc('views_count')
            ->limit(5)
            ->get(['id', 'title', 'views_count', 'likes_count', 'comments_count']);

        $topLiked = NewsPost::query()
            ->orderByDesc('likes_count')
            ->limit(5)
            ->get(['id', 'title', 'views_count', 'likes_count', 'comments_count']);

        $monthly = NewsPost::query()
            ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as posts')
            ->where('created_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $activeCommenters = NewsComment::query()
            ->select('member_id', DB::raw('COUNT(*) as total'))
            ->whereNotNull('member_id')
            ->groupBy('member_id')
            ->orderByDesc('total')
            ->with('member:id,first_name,last_name')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'member' => $row->member?->full_name ?? 'Membre',
                'comments' => (int) $row->total,
            ]);

        return response()->json([
            'total_posts' => NewsPost::count(),
            'total_views' => (int) NewsPost::sum('views_count'),
            'total_likes' => (int) NewsPost::sum('likes_count'),
            'total_comments' => (int) NewsPost::sum('comments_count'),
            'total_shares' => (int) NewsPost::sum('shares_count'),
            'top_posts' => NewsPost::query()
                ->orderByDesc('likes_count')
                ->limit(5)
                ->get(['id', 'title', 'likes_count', 'views_count', 'comments_count']),
            'top_viewed' => $topViewed,
            'top_liked' => $topLiked,
            'monthly_evolution' => $monthly,
            'most_active_users' => $activeCommenters,
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => array_map(fn (NewsCategory $c) => [
                'value' => $c->value,
                'label' => $c->label(),
                'badge' => $c->badge(),
            ], NewsCategory::cases()),
        ]);
    }

    private function validatePost(Request $request, bool $updating = false): array
    {
        $mediaMaxKb = (int) config('jeunesse.news_media.max_kilobytes', 102400);

        $rules = [
            'title' => [$updating ? 'sometimes' : 'required', 'string', 'max:200'],
            'body' => [$updating ? 'sometimes' : 'required', 'string', 'max:50000'],
            'category' => ['nullable', 'string', 'in:'.implode(',', array_column(NewsCategory::cases(), 'value'))],
            'media_type' => ['nullable', 'string', 'in:text,image,video,document,link'],
            'external_url' => ['nullable', 'string', 'max:500'],
            'text_background' => ['nullable', 'string', 'in:none,ocean,sunset,forest,royal,rdc,night,coral,mint,lavender,sky,fire'],
            'activity_id' => ['nullable', 'integer', 'exists:activities,id'],
            'is_published' => ['nullable', 'boolean'],
            'image' => ['nullable', 'file', 'max:'.$mediaMaxKb],
            'video' => ['nullable', 'file', 'max:'.$mediaMaxKb],
            'document' => ['nullable', 'file', 'max:10240'],
            'gallery' => ['nullable', 'array', 'max:10'],
            'gallery.*' => ['file', 'max:'.$mediaMaxKb],
        ];

        return $request->validate($rules);
    }

    private function recordView(Request $request, NewsPost $post): void
    {
        $userId = $request->user()->id;
        $memberId = $request->user()->member_id;
        $today = now()->startOfDay();

        $alreadyViewed = NewsView::query()
            ->where('news_post_id', $post->id)
            ->where('user_id', $userId)
            ->where('viewed_at', '>=', $today)
            ->exists();

        if (! $alreadyViewed) {
            NewsView::create([
                'news_post_id' => $post->id,
                'user_id' => $userId,
                'member_id' => $memberId,
                'viewed_at' => now(),
            ]);
            $post->increment('views_count');
        }
    }

    private function formatPost(NewsPost $post, ?int $memberId = null, bool $detailed = false, ?string $myReaction = null, ?int $userId = null): array
    {
        $category = NewsCategory::tryFrom($post->category ?? 'general') ?? NewsCategory::General;

        if ($myReaction === null && $userId) {
            $myReaction = $post->relationLoaded('reactions')
                ? $post->reactions->firstWhere('user_id', $userId)?->type
                : $post->reactions()->where('user_id', $userId)->value('type');
        } elseif ($myReaction === null && $memberId) {
            $myReaction = $post->relationLoaded('reactions')
                ? $post->reactions->firstWhere('member_id', $memberId)?->type
                : $post->reactions()->where('member_id', $memberId)->value('type');
        }

        $base = [
            'id' => $post->id,
            'title' => $post->title,
            'body' => $post->body,
            'category' => $category->value,
            'category_label' => $category->label(),
            'category_badge' => $category->badge(),
            'media_type' => $post->media_type,
            'media_url' => $post->media_path ? url("/api/media/news/{$post->id}/file") : null,
            'gallery_urls' => collect($post->gallery_paths ?? [])->map(
                fn ($_, $i) => url("/api/media/news/{$post->id}/gallery/{$i}")
            )->values()->all(),
            'external_url' => $this->parseExternalUrl($post->external_url, $post->media_type),
            'text_background' => $this->parseTextBackground($post->external_url, $post->media_type),
            'author' => $post->author?->name,
            'author_role' => $post->author?->role?->name,
            'activity' => $post->activity ? [
                'id' => $post->activity->id,
                'title' => $post->activity->title,
                'code' => $post->activity->code,
                'starts_at' => $post->activity->starts_at?->toIso8601String(),
                'location' => $post->activity->location,
            ] : null,
            'views_count' => $post->views_count,
            'likes_count' => $post->likes_count,
            'comments_count' => $post->comments_count,
            'shares_count' => $post->shares_count,
            'my_reaction' => $myReaction,
            'created_at' => $post->created_at?->toIso8601String(),
            'status' => $this->resolveStatus($post),
        ];

        if ($detailed) {
            $base['reactions'] = $this->reactionCounts($post);
        }

        return $base;
    }

    private function formatComment(NewsComment $comment, bool $withReplies = false, ?int $userId = null): array
    {
        $liked = $userId && $comment->relationLoaded('likes')
            ? $comment->likes->isNotEmpty()
            : ($userId ? $comment->likes()->where('user_id', $userId)->exists() : false);

        $data = [
            'id' => $comment->id,
            'body' => $comment->body,
            'author' => $comment->user?->name ?? $comment->member?->full_name ?? 'Membre',
            'user_id' => $comment->user_id,
            'parent_id' => $comment->parent_id,
            'likes_count' => (int) ($comment->likes_count ?? 0),
            'liked' => $liked,
            'created_at' => $comment->created_at?->toIso8601String(),
            'updated_at' => $comment->updated_at?->toIso8601String(),
        ];

        if ($withReplies && $comment->relationLoaded('replies')) {
            $data['replies'] = $comment->replies->map(
                fn (NewsComment $r) => $this->formatComment($r, userId: $userId),
            );
        }

        return $data;
    }

    private function reactionCounts(NewsPost $post): array
    {
        return $post->reactions()
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->all();
    }

    private function resolveStatus(NewsPost $post): string
    {
        if ($post->trashed()) {
            return 'archived';
        }

        return $post->is_published ? 'published' : 'draft';
    }

    private function canManage(Request $request): bool
    {
        return $request->user()->can('manage', NewsPost::class);
    }

    private function parseTextBackground(?string $externalUrl, ?string $mediaType): ?string
    {
        if ($mediaType === 'text' && $externalUrl && str_starts_with($externalUrl, 'bg:')) {
            return substr($externalUrl, 3);
        }

        return null;
    }

    private function parseExternalUrl(?string $externalUrl, ?string $mediaType): ?string
    {
        if ($mediaType === 'text' && $externalUrl && str_starts_with($externalUrl, 'bg:')) {
            return null;
        }

        return $externalUrl;
    }

    private function resolveExternalUrl(array $validated, string $mediaType, ?string $fallback = null): ?string
    {
        if ($mediaType === 'text') {
            $bg = $validated['text_background'] ?? 'none';

            return ($bg && $bg !== 'none') ? "bg:{$bg}" : null;
        }

        return $validated['external_url'] ?? $fallback;
    }
}
