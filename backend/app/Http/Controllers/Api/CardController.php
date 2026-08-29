<?php

namespace App\Http\Controllers\Api;

use App\Enums\CardStatus;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Resources\MemberCardListResource;
use App\Http\Resources\MemberCardResource;
use App\Models\Member;
use App\Models\MemberCard;
use App\Models\User;
use App\Services\CardPresentationService;
use App\Services\CardService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CardController extends Controller
{
    public function __construct(
        private readonly CardService $cards,
        private readonly CardPresentationService $presentation,
    ) {}

    /** Registre paginé des cartes émises (page /cartes). */
    public function index(Request $request): AnonymousResourceCollection
    {
        $cards = $this->scopedQuery($request->user())
            ->when($request->input('status'), fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($request->filled('q'), fn (Builder $q) => $this->applySearch($q, (string) $request->input('q')))
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 20), 100))
            ->withQueryString();

        return MemberCardListResource::collection($cards);
    }

    /** Galerie visuelle recto/verso (/cartes/galerie). */
    public function visual(Request $request): JsonResponse
    {
        $cards = $this->scopedQuery($request->user())
            ->when($request->input('status'), fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($request->filled('q'), fn (Builder $q) => $this->applySearch($q, (string) $request->input('q')))
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->paginate(min($request->integer('per_page', 12), 48))
            ->withQueryString();

        $items = $cards->getCollection()->map(function (MemberCard $card) {
            $member = $card->member;

            return [
                'member_id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'card' => (new MemberCardResource($card))->resolve(),
                'render' => $this->presentation->render($member, $card),
            ];
        });

        return response()->json([
            'data' => $items->values(),
            'links' => [
                'first' => $cards->url(1),
                'last' => $cards->url($cards->lastPage()),
                'prev' => $cards->previousPageUrl(),
                'next' => $cards->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $cards->currentPage(),
                'from' => $cards->firstItem(),
                'last_page' => $cards->lastPage(),
                'path' => $cards->path(),
                'per_page' => $cards->perPage(),
                'to' => $cards->lastItem(),
                'total' => $cards->total(),
            ],
        ]);
    }

    public function regenerate(Request $request, MemberCard $card): JsonResponse
    {
        $card = $this->findVisibleCard($request->user(), $card);
        $this->authorize('manageCard', $card->member);

        $newCard = $this->cards->issue(
            $card->member,
            $request->user(),
            'Régénération de carte',
        );

        return response()->json([
            'message' => 'Carte régénérée.',
            'data' => new MemberCardResource($newCard),
        ]);
    }

    public function revoke(Request $request, MemberCard $card): JsonResponse
    {
        $user = $request->user();

        abort_unless(
            $user?->hasPermission(Permission::CardsRevoke) || $user?->hasPermission(Permission::CardsIssue),
            403,
            "Vous n'avez pas l'autorisation d'effectuer cette action.",
        );

        $card = $this->findVisibleCard($user, $card);
        abort_unless($card->member->isVisibleTo($user), 404, 'Ressource introuvable.');

        $validated = $request->validate([
            'status' => ['nullable', Rule::in([
                CardStatus::Inactive->value,
                CardStatus::Suspended->value,
                CardStatus::Lost->value,
                CardStatus::Expired->value,
            ])],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $revoked = $this->cards->revoke(
            $card,
            CardStatus::from($validated['status'] ?? CardStatus::Inactive->value),
            $validated['reason'] ?? 'Désactivation administrative',
        );

        return response()->json([
            'message' => 'Carte désactivée. Son QR code n\'est plus valide.',
            'data' => new MemberCardResource($revoked),
        ]);
    }

    private function scopedQuery(User $user): Builder
    {
        return MemberCard::query()
            ->with(['member.province:id,name'])
            ->whereIn(
                'member_id',
                Member::query()->visibleTo($user)->select('members.id'),
            );
    }

    private function applySearch(Builder $query, string $term): void
    {
        $like = '%'.addcslashes(trim($term), '%_\\').'%';

        $query->where(function (Builder $q) use ($like) {
            $q->where('card_number', 'like', $like)
                ->orWhereHas('member', function (Builder $member) use ($like) {
                    $member->where('member_code', 'like', $like)
                        ->orWhere('last_name', 'like', $like)
                        ->orWhere('first_name', 'like', $like)
                        ->orWhere('middle_name', 'like', $like);
                });
        });
    }

    private function findVisibleCard(User $user, MemberCard $card): MemberCard
    {
        $visible = MemberCard::query()
            ->with('member')
            ->whereKey($card->id)
            ->whereIn(
                'member_id',
                Member::query()->visibleTo($user)->select('members.id'),
            )
            ->first();

        abort_unless($visible, 404, 'Ressource introuvable.');

        return $visible;
    }
}
