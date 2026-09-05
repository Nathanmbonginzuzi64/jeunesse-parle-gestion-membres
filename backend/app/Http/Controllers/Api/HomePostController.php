<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\HomePost;
use App\Models\HomePostComment;
use App\Models\HomePostLike;
use App\Models\HomePostShare;
use App\Models\HomePostView;
use App\Services\AuditLogger;
use App\Services\HomePostMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Posts d'actualité de la page d'accueil.
 * Indépendant du fil membres `/api/news` (news_posts).
 */
class HomePostController extends Controller
{
    public function __construct(
        private readonly HomePostMediaService $media,
        private readonly AuditLogger $audit,
    ) {}

    /** Liste publique des posts publiés (paginée). */
    public function publicIndex(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', $request->query('limit', 12)), 1), 48);
        $page = max((int) $request->query('page', 1), 1);

        $paginator = HomePost::query()
            ->published()
            ->ordered()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginator->items())
                ->map(fn (HomePost $post) => $this->formatPublic($post))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /** Image publique d'un post publié. */
    public function publicImage(HomePost $homePost): Response|BinaryFileResponse
    {
        abort_unless($this->isPubliclyVisible($homePost) && filled($homePost->image_path), 404);

        $absolute = $this->media->absolutePath($homePost->image_path);
        abort_unless($absolute, 404);

        return response()->file($absolute, [
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /** Vidéo publique d'un post publié. */
    public function publicVideo(HomePost $homePost): Response|BinaryFileResponse
    {
        abort_unless($this->isPubliclyVisible($homePost) && filled($homePost->video_path), 404);

        $absolute = $this->media->absolutePath($homePost->video_path);
        abort_unless($absolute, 404);

        return response()->file($absolute, [
            'Cache-Control' => 'public, max-age=3600',
            'Accept-Ranges' => 'bytes',
        ]);
    }

    /** Détail public + enregistrement de vue (commentaires via endpoint dédié). */
    public function publicShow(Request $request, HomePost $homePost): JsonResponse
    {
        abort_unless($this->isPubliclyVisible($homePost), 404);

        $visitorKey = $this->visitorKey($request);
        $silent = $request->boolean('silent')
            || strtolower((string) $request->header('X-Silent-Refresh', '')) === '1';

        if (! $silent) {
            $this->recordView($homePost, $visitorKey, $request->ip());
            $homePost->refresh();
        }

        $liked = HomePostLike::query()
            ->where('home_post_id', $homePost->id)
            ->where('visitor_key', $visitorKey)
            ->exists();

        return response()->json([
            'data' => [
                ...$this->formatPublic($homePost),
                'liked_by_me' => $liked,
            ],
        ]);
    }

    /** Commentaires racine paginés + réponses imbriquées. */
    public function publicComments(Request $request, HomePost $homePost): JsonResponse
    {
        abort_unless($this->isPubliclyVisible($homePost), 404);

        $perPage = min(max((int) $request->query('per_page', 8), 1), 30);
        $page = max((int) $request->query('page', 1), 1);

        $paginator = HomePostComment::query()
            ->where('home_post_id', $homePost->id)
            ->whereNull('parent_id')
            ->where('is_approved', true)
            ->with(['replies' => fn ($q) => $q->where('is_approved', true)->orderBy('created_at')])
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginator->items())
                ->map(fn (HomePostComment $c) => $this->formatComment($c, withReplies: true))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'comments_count' => (int) $homePost->comments_count,
        ]);
    }

    public function publicLike(Request $request, HomePost $homePost): JsonResponse
    {
        abort_unless($this->isPubliclyVisible($homePost), 404);

        $visitorKey = $this->visitorKey($request);
        $remove = $request->boolean('remove');

        if ($remove) {
            $deleted = HomePostLike::query()
                ->where('home_post_id', $homePost->id)
                ->where('visitor_key', $visitorKey)
                ->delete();

            if ($deleted) {
                $homePost->decrement('likes_count');
            }
        } else {
            $created = HomePostLike::query()->firstOrCreate([
                'home_post_id' => $homePost->id,
                'visitor_key' => $visitorKey,
            ]);

            if ($created->wasRecentlyCreated) {
                $homePost->increment('likes_count');
            }
        }

        $homePost->refresh();

        return response()->json([
            'message' => $remove ? 'Like retiré.' : 'Merci pour votre like.',
            'likes_count' => (int) $homePost->likes_count,
            'liked_by_me' => ! $remove && HomePostLike::query()
                ->where('home_post_id', $homePost->id)
                ->where('visitor_key', $visitorKey)
                ->exists(),
        ]);
    }

    public function publicComment(Request $request, HomePost $homePost): JsonResponse
    {
        abort_unless($this->isPubliclyVisible($homePost), 404);

        $data = Validator::make($request->all(), [
            'author_name' => ['required', 'string', 'max:80'],
            'author_email' => ['nullable', 'email', 'max:160'],
            'body' => ['required', 'string', 'min:2', 'max:2000'],
            'parent_id' => ['nullable', 'integer', 'exists:home_post_comments,id'],
        ], [
            'author_name.required' => 'Indiquez votre nom.',
            'body.required' => 'Écrivez un commentaire.',
            'body.min' => 'Le commentaire est trop court.',
        ])->validate();

        $parentId = $data['parent_id'] ?? null;
        if ($parentId) {
            $parent = HomePostComment::query()->findOrFail($parentId);
            abort_unless(
                (int) $parent->home_post_id === (int) $homePost->id && $parent->parent_id === null,
                422,
                'Réponse invalide : vous ne pouvez répondre qu’à un commentaire principal.',
            );
        }

        $comment = HomePostComment::query()->create([
            'home_post_id' => $homePost->id,
            'parent_id' => $parentId,
            'author_name' => trim($data['author_name']),
            'author_email' => isset($data['author_email']) ? mb_strtolower(trim($data['author_email'])) : null,
            'body' => trim($data['body']),
            'is_approved' => true,
            'visitor_key' => $this->visitorKey($request),
            'ip_address' => $request->ip(),
        ]);

        $homePost->increment('comments_count');

        return response()->json([
            'message' => $parentId ? 'Réponse publiée.' : 'Commentaire publié.',
            'data' => $this->formatComment($comment->fresh('replies'), withReplies: true),
            'comments_count' => (int) $homePost->fresh()->comments_count,
        ], 201);
    }

    public function publicShare(Request $request, HomePost $homePost): JsonResponse
    {
        abort_unless($this->isPubliclyVisible($homePost), 404);

        $data = Validator::make($request->all(), [
            'channel' => ['nullable', 'string', 'max:40'],
        ])->validate();

        HomePostShare::query()->create([
            'home_post_id' => $homePost->id,
            'visitor_key' => $this->visitorKey($request),
            'channel' => $data['channel'] ?? 'link',
            'ip_address' => $request->ip(),
        ]);

        $homePost->increment('shares_count');

        return response()->json([
            'message' => 'Partage enregistré.',
            'shares_count' => (int) $homePost->fresh()->shares_count,
        ]);
    }

    /** Administration : liste paginée + totaux globaux. */
    public function index(Request $request): JsonResponse
    {
        $this->assertSuperAdmin();

        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);
        $page = max((int) $request->query('page', 1), 1);

        $base = HomePost::query();
        $summary = [
            'posts' => (int) (clone $base)->count(),
            'published' => (int) (clone $base)->where('is_published', true)->count(),
            'views' => (int) (clone $base)->sum('views_count'),
            'likes' => (int) (clone $base)->sum('likes_count'),
            'comments' => (int) (clone $base)->sum('comments_count'),
            'shares' => (int) (clone $base)->sum('shares_count'),
        ];

        $paginator = HomePost::query()
            ->with('author:id,name')
            ->ordered()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginator->items())
                ->map(fn (HomePost $post) => $this->formatAdmin($post))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'summary' => $summary,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertSuperAdmin();
        $data = $this->validated($request);

        $post = new HomePost(collect($data)->except(['image', 'video', 'remove_image', 'remove_video'])->all());
        $post->author_id = $request->user()->id;
        $post->is_published = filter_var($data['is_published'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $post->published_at = $post->is_published
            ? ($data['published_at'] ?? now())
            : ($data['published_at'] ?? null);

        if ($request->hasFile('image')) {
            $post->image_path = $this->media->storeImage($request->file('image'));
        }

        if ($request->hasFile('video')) {
            $post->video_path = $this->media->storeVideo($request->file('video'));
        }

        $post->save();

        $this->audit->log('home_post.created', $post, "Post accueil : {$post->title}");

        return response()->json([
            'message' => 'Post d\'accueil créé.',
            'data' => $this->formatAdmin($post->fresh('author')),
        ], 201);
    }

    public function show(HomePost $homePost): JsonResponse
    {
        $this->assertSuperAdmin();

        return response()->json([
            'data' => $this->formatAdmin($homePost->load('author:id,name')),
        ]);
    }

    public function update(Request $request, HomePost $homePost): JsonResponse
    {
        $this->assertSuperAdmin();
        $data = $this->validated($request, updating: true);

        $homePost->fill(collect($data)->except(['is_published', 'published_at', 'remove_image', 'remove_video', 'image', 'video'])->all());

        if (array_key_exists('is_published', $data)) {
            $homePost->is_published = filter_var($data['is_published'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('published_at', $data)) {
            $homePost->published_at = $data['published_at'] ?: null;
        }

        if ($homePost->is_published && ! $homePost->published_at) {
            $homePost->published_at = now();
        }

        if ($request->boolean('remove_image')) {
            $this->media->delete($homePost->image_path);
            $homePost->image_path = null;
        }

        if ($request->boolean('remove_video')) {
            $this->media->delete($homePost->video_path);
            $homePost->video_path = null;
        }

        if ($request->hasFile('image')) {
            $homePost->image_path = $this->media->storeImage(
                $request->file('image'),
                $homePost->image_path,
            );
        }

        if ($request->hasFile('video')) {
            $homePost->video_path = $this->media->storeVideo(
                $request->file('video'),
                $homePost->video_path,
            );
        }

        $homePost->save();

        $this->audit->log('home_post.updated', $homePost, "Post accueil mis à jour : {$homePost->title}");

        return response()->json([
            'message' => 'Post d\'accueil mis à jour.',
            'data' => $this->formatAdmin($homePost->fresh('author')),
        ]);
    }

    public function destroy(HomePost $homePost): JsonResponse
    {
        $this->assertSuperAdmin();

        $title = $homePost->title;
        $homePost->delete();

        $this->audit->log('home_post.deleted', $homePost, "Post accueil supprimé : {$title}");

        return response()->json([
            'message' => 'Post d\'accueil archivé.',
        ]);
    }

    private function assertSuperAdmin(): void
    {
        $user = request()->user();
        abort_unless(
            $user
            && $user->role
            && $user->role->slug === RoleSlug::SuperAdmin->value,
            403,
            'Réservé au super administrateur.',
        );
    }

    private function validated(Request $request, bool $updating = false): array
    {
        $required = $updating ? 'sometimes' : 'required';

        $validator = Validator::make($request->all(), [
            'title' => [$required, 'string', 'max:180'],
            'excerpt' => ['nullable', 'string', 'max:400'],
            'body' => ['nullable', 'string', 'max:20000'],
            'category' => ['nullable', 'string', 'max:60'],
            'external_url' => ['nullable', 'string', 'max:500'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'video' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/quicktime', 'max:204800'],
            'remove_image' => ['nullable', 'boolean'],
            'remove_video' => ['nullable', 'boolean'],
        ], [
            'title.required' => 'Le titre est obligatoire.',
            'image.mimes' => 'Formats image acceptés : JPG, PNG, WEBP.',
            'image.max' => 'L\'image ne doit pas dépasser 5 Mo.',
            'video.mimetypes' => 'Formats vidéo acceptés : MP4, WEBM, MOV.',
            'video.max' => 'La vidéo ne doit pas dépasser 200 Mo.',
        ]);

        return $validator->validate();
    }

    private function formatPublic(HomePost $post): array
    {
        return [
            'id' => $post->id,
            'title' => $post->title,
            'excerpt' => $post->excerpt,
            'body' => $post->body,
            'category' => $post->category,
            'external_url' => $post->external_url,
            'published_at' => $post->published_at?->toIso8601String(),
            'image_url' => $post->image_path
                ? url('/api/public/home-posts/'.$post->id.'/image')
                : null,
            'video_url' => $post->video_path
                ? url('/api/public/home-posts/'.$post->id.'/video')
                : null,
            'views_count' => (int) $post->views_count,
            'likes_count' => (int) $post->likes_count,
            'comments_count' => (int) $post->comments_count,
            'shares_count' => (int) $post->shares_count,
            'updated_at' => $post->updated_at?->toIso8601String(),
        ];
    }

    private function formatComment(HomePostComment $comment, bool $withReplies = false): array
    {
        $payload = [
            'id' => $comment->id,
            'parent_id' => $comment->parent_id,
            'author_name' => $comment->author_name,
            'body' => $comment->body,
            'created_at' => $comment->created_at?->toIso8601String(),
        ];

        if ($withReplies) {
            $replies = $comment->relationLoaded('replies')
                ? $comment->replies
                : $comment->replies()->where('is_approved', true)->orderBy('created_at')->get();

            $payload['replies'] = $replies
                ->map(fn (HomePostComment $reply) => $this->formatComment($reply))
                ->values();
            $payload['replies_count'] = $replies->count();
        }

        return $payload;
    }

    private function isPubliclyVisible(HomePost $post): bool
    {
        return $post->is_published
            && ($post->published_at === null || $post->published_at->lte(now()));
    }

    private function visitorKey(Request $request): string
    {
        $key = trim((string) $request->header('X-Visitor-Key', ''));
        if ($key !== '' && preg_match('/^[A-Za-z0-9_-]{8,64}$/', $key)) {
            return $key;
        }

        return substr(hash('sha256', ($request->ip() ?? '0').'|'.($request->userAgent() ?? '')), 0, 32);
    }

    private function recordView(HomePost $post, string $visitorKey, ?string $ip): void
    {
        $today = now()->toDateString();

        try {
            $inserted = HomePostView::query()->insertOrIgnore([
                'home_post_id' => $post->id,
                'visitor_key' => $visitorKey,
                'ip_address' => $ip,
                'viewed_on' => $today,
                'viewed_at' => now(),
            ]);

            if ($inserted) {
                $post->increment('views_count');
            }
        } catch (\Throwable) {
            // Ignore collisions / race conditions.
        }
    }

    private function formatAdmin(HomePost $post): array
    {
        return [
            ...$this->formatPublic($post),
            'is_published' => $post->is_published,
            'sort_order' => $post->sort_order,
            'image_path' => $post->image_path,
            'video_path' => $post->video_path,
            'author' => $post->author ? [
                'id' => $post->author->id,
                'name' => $post->author->name,
            ] : null,
            'created_at' => $post->created_at?->toIso8601String(),
            'updated_at' => $post->updated_at?->toIso8601String(),
            // URL admin même si brouillon (médias privés via routes auth)
            'image_url' => $post->image_path
                ? url('/api/home-posts/'.$post->id.'/image')
                : null,
            'video_url' => $post->video_path
                ? url('/api/home-posts/'.$post->id.'/video')
                : null,
        ];
    }

    /** Image admin (brouillons inclus). */
    public function adminImage(HomePost $homePost): Response|BinaryFileResponse
    {
        $this->assertSuperAdmin();
        abort_unless(filled($homePost->image_path), 404);

        $absolute = $this->media->absolutePath($homePost->image_path);
        abort_unless($absolute, 404);

        return response()->file($absolute, [
            'Cache-Control' => 'private, max-age=300',
        ]);
    }

    /** Vidéo admin (brouillons inclus). */
    public function adminVideo(HomePost $homePost): Response|BinaryFileResponse
    {
        $this->assertSuperAdmin();
        abort_unless(filled($homePost->video_path), 404);

        $absolute = $this->media->absolutePath($homePost->video_path);
        abort_unless($absolute, 404);

        return response()->file($absolute, [
            'Cache-Control' => 'private, max-age=300',
            'Accept-Ranges' => 'bytes',
        ]);
    }
}
