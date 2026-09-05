<?php

namespace App\Http\Controllers\Api;

use App\Enums\RoleSlug;
use App\Http\Controllers\Controller;
use App\Models\HomePost;
use App\Models\HomePostComment;
use App\Models\HomePostLike;
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

    /** Détail public + commentaires + enregistrement de vue. */
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

        $comments = HomePostComment::query()
            ->where('home_post_id', $homePost->id)
            ->where('is_approved', true)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $liked = HomePostLike::query()
            ->where('home_post_id', $homePost->id)
            ->where('visitor_key', $visitorKey)
            ->exists();

        return response()->json([
            'data' => [
                ...$this->formatPublic($homePost),
                'liked_by_me' => $liked,
                'comments' => $comments->map(fn (HomePostComment $c) => $this->formatComment($c))->values(),
            ],
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
            'body' => ['required', 'string', 'min:3', 'max:2000'],
        ], [
            'author_name.required' => 'Indiquez votre nom.',
            'body.required' => 'Écrivez un commentaire.',
            'body.min' => 'Le commentaire est trop court.',
        ])->validate();

        $comment = HomePostComment::query()->create([
            'home_post_id' => $homePost->id,
            'author_name' => trim($data['author_name']),
            'author_email' => isset($data['author_email']) ? mb_strtolower(trim($data['author_email'])) : null,
            'body' => trim($data['body']),
            'is_approved' => true,
            'visitor_key' => $this->visitorKey($request),
            'ip_address' => $request->ip(),
        ]);

        $homePost->increment('comments_count');

        return response()->json([
            'message' => 'Commentaire publié.',
            'data' => $this->formatComment($comment),
            'comments_count' => (int) $homePost->fresh()->comments_count,
        ], 201);
    }

    /** Administration : liste complète. */
    public function index(): JsonResponse
    {
        $this->assertSuperAdmin();

        $posts = HomePost::query()
            ->with('author:id,name')
            ->ordered()
            ->get();

        return response()->json([
            'data' => $posts->map(fn (HomePost $post) => $this->formatAdmin($post))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertSuperAdmin();
        $data = $this->validated($request);

        $post = new HomePost(collect($data)->except(['image', 'remove_image'])->all());
        $post->author_id = $request->user()->id;
        $post->is_published = filter_var($data['is_published'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $post->published_at = $post->is_published
            ? ($data['published_at'] ?? now())
            : ($data['published_at'] ?? null);

        if ($request->hasFile('image')) {
            $post->image_path = $this->media->storeImage($request->file('image'));
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

        $homePost->fill(collect($data)->except(['is_published', 'published_at', 'remove_image'])->all());

        if (array_key_exists('is_published', $data)) {
            $homePost->is_published = filter_var($data['is_published'], FILTER_VALIDATE_BOOLEAN);
            if ($homePost->is_published && ! $homePost->published_at) {
                $homePost->published_at = $data['published_at'] ?? now();
            }
            if (! $homePost->is_published) {
                $homePost->published_at = $data['published_at'] ?? $homePost->published_at;
            }
        } elseif (array_key_exists('published_at', $data)) {
            $homePost->published_at = $data['published_at'];
        }

        if ($request->boolean('remove_image')) {
            $this->media->delete($homePost->image_path);
            $homePost->image_path = null;
        }

        if ($request->hasFile('image')) {
            $homePost->image_path = $this->media->storeImage(
                $request->file('image'),
                $homePost->image_path,
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
            'external_url' => ['nullable', 'url', 'max:500'],
            'is_published' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_image' => ['nullable', 'boolean'],
        ], [
            'title.required' => 'Le titre est obligatoire.',
            'image.mimes' => 'Formats image acceptés : JPG, PNG, WEBP.',
            'image.max' => 'L\'image ne doit pas dépasser 5 Mo.',
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
            'views_count' => (int) $post->views_count,
            'likes_count' => (int) $post->likes_count,
            'comments_count' => (int) $post->comments_count,
            'updated_at' => $post->updated_at?->toIso8601String(),
        ];
    }

    private function formatComment(HomePostComment $comment): array
    {
        return [
            'id' => $comment->id,
            'author_name' => $comment->author_name,
            'body' => $comment->body,
            'created_at' => $comment->created_at?->toIso8601String(),
        ];
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
            'author' => $post->author ? [
                'id' => $post->author->id,
                'name' => $post->author->name,
            ] : null,
            'created_at' => $post->created_at?->toIso8601String(),
            'updated_at' => $post->updated_at?->toIso8601String(),
            // URL admin même si brouillon (image privée via route auth ci-dessous)
            'image_url' => $post->image_path
                ? url('/api/home-posts/'.$post->id.'/image')
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
}
