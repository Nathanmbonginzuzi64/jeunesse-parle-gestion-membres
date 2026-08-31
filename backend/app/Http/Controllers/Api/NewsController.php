<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NewsComment;
use App\Models\NewsPost;
use App\Models\NewsReaction;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $posts = NewsPost::query()
            ->with(['author:id,name', 'activity:id,title,code'])
            ->where('is_published', true)
            ->latest()
            ->paginate(min($request->integer('per_page', 20), 50));

        return response()->json([
            'data' => $posts->getCollection()->map(fn (NewsPost $post) => $this->formatPost($post)),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', NewsPost::class);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:10000'],
            'media_type' => ['nullable', 'string', 'in:text,image,video,document,link'],
            'external_url' => ['nullable', 'url', 'max:500'],
            'activity_id' => ['nullable', 'integer', 'exists:activities,id'],
        ]);

        $post = NewsPost::create([
            ...$validated,
            'media_type' => $validated['media_type'] ?? 'text',
            'author_id' => $request->user()->id,
            'is_published' => true,
        ]);

        $this->audit->log('news.created', $post, "Publication : {$post->title}");

        return response()->json([
            'message' => 'Actualité publiée.',
            'data' => $this->formatPost($post->load(['author', 'activity'])),
        ], 201);
    }

    public function react(Request $request, NewsPost $newsPost): JsonResponse
    {
        $member = $request->user()->member;
        abort_unless($member, 403);

        $validated = $request->validate([
            'type' => ['nullable', 'string', 'in:like,love,support,celebrate'],
        ]);

        $reaction = NewsReaction::updateOrCreate(
            ['news_post_id' => $newsPost->id, 'member_id' => $member->id],
            ['type' => $validated['type'] ?? 'like'],
        );

        $newsPost->update(['likes_count' => $newsPost->reactions()->count()]);

        return response()->json(['message' => 'Réaction enregistrée.', 'type' => $reaction->type]);
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

        $newsPost->increment('comments_count');

        return response()->json(['message' => 'Commentaire publié.', 'data' => $comment], 201);
    }

    public function show(NewsPost $newsPost): JsonResponse
    {
        $newsPost->increment('views_count');
        $newsPost->load(['author:id,name', 'activity:id,title,code', 'comments' => fn ($q) => $q->with(['member:id,first_name,last_name', 'user:id,name'])->latest()->limit(50)]);

        return response()->json(['data' => [
            ...$this->formatPost($newsPost),
            'comments' => $newsPost->comments->map(fn (NewsComment $c) => [
                'id' => $c->id,
                'body' => $c->body,
                'author' => $c->user?->name ?? $c->member?->full_name ?? 'Membre',
                'created_at' => $c->created_at?->toIso8601String(),
            ]),
        ]]);
    }

    public function share(Request $request, NewsPost $newsPost): JsonResponse
    {
        $newsPost->increment('shares_count');

        return response()->json(['message' => 'Partage enregistré.', 'shares_count' => $newsPost->shares_count]);
    }

    public function stats(): JsonResponse
    {
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
        ]);
    }

    private function formatPost(NewsPost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'body' => $post->body,
            'media_type' => $post->media_type,
            'external_url' => $post->external_url,
            'author' => $post->author?->name,
            'activity' => $post->activity ? [
                'id' => $post->activity->id,
                'title' => $post->activity->title,
                'code' => $post->activity->code,
            ] : null,
            'views_count' => $post->views_count,
            'likes_count' => $post->likes_count,
            'comments_count' => $post->comments_count,
            'shares_count' => $post->shares_count,
            'created_at' => $post->created_at?->toIso8601String(),
        ];
    }
}
