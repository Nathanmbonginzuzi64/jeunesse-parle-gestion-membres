<?php

namespace App\Services;

use App\Enums\RoleSlug;
use App\Models\ChatParticipant;
use App\Models\Member;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Graphe « qui peut écrire à qui » : périmètre territorial + rôle.
 * Super-admin : contacte tout le monde.
 */
class ChatDirectoryService
{
    public function canContact(User $actor, User $target): bool
    {
        if (! $actor->is_active || ! $target->is_active) {
            return false;
        }

        if ((int) $actor->id === (int) $target->id) {
            return false;
        }

        $actor->loadMissing(['role', 'member.structure.leader']);
        $target->loadMissing(['role', 'member']);

        if ($actor->hasRole(RoleSlug::SuperAdmin)) {
            return true;
        }

        if ($target->hasRole(RoleSlug::SuperAdmin)) {
            return $actor->scopeLevel() === 0;
        }

        $actorIsMember = $actor->scopeLevel() >= 4;
        $targetIsMember = $target->scopeLevel() >= 4;

        $leaderUserId = $actor->member?->structure?->leader?->user_id;
        if ($actorIsMember && $leaderUserId && (int) $leaderUserId === (int) $target->id) {
            return true;
        }

        if ($actorIsMember && $targetIsMember) {
            return $this->sameStructure($actor, $target);
        }

        if ($actorIsMember && ! $targetIsMember) {
            return $this->staffCoversMember($target, $actor->member);
        }

        if (! $actorIsMember && $targetIsMember) {
            return $target->member?->isVisibleTo($actor) ?? false;
        }

        return $this->staffSharesScope($actor, $target);
    }

    /**
     * Annuaire paginé (recherche serveur) pour le panneau « Contacter ».
     *
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function paginatedContacts(User $actor, ?string $search = null, int $perPage = 20): LengthAwarePaginator
    {
        $actor->loadMissing(['role', 'member.structure.leader', 'member.province', 'member.city']);
        $perPage = max(5, min($perPage, 50));
        $search = trim((string) $search);

        $query = User::query()
            ->where('is_active', true)
            ->where('id', '!=', $actor->id)
            ->with(['role', 'member', 'province', 'city', 'structure']);

        if (! $actor->hasRole(RoleSlug::SuperAdmin)) {
            $ids = $this->contactableUserIds($actor);
            if ($ids === []) {
                return new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage);
            }
            $query->whereIn('id', $ids);
        }

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
            $query->where(function (Builder $q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhereHas('member', function (Builder $m) use ($like) {
                        $m->where('member_code', 'like', $like)
                            ->orWhere('first_name', 'like', $like)
                            ->orWhere('last_name', 'like', $like)
                            ->orWhere('middle_name', 'like', $like);
                    })
                    ->orWhereHas('role', fn (Builder $r) => $r->where('name', 'like', $like));
            });
        }

        $paginator = $query
            ->orderByRaw('CASE WHEN EXISTS (SELECT 1 FROM members WHERE members.user_id = users.id) THEN 1 ELSE 0 END')
            ->orderBy('name')
            ->paginate($perPage);

        $paginator->setCollection(
            $paginator->getCollection()->map(function (User $user) use ($actor) {
                $contact = $this->serializeContact($user);
                $contact['group_id'] = $this->groupIdFor($actor, $user);
                $contact['group_label'] = $this->groupLabelFor($contact['group_id'], $actor);

                return $contact;
            })
        );

        return $paginator;
    }

    /** @return list<int> */
    private function contactableUserIds(User $actor): array
    {
        $seen = [];

        if ($actor->scopeLevel() >= 4) {
            $member = $actor->member;
            foreach ($this->staffCoveringMember($member) as $user) {
                if ($this->canContact($actor, $user)) {
                    $seen[$user->id] = true;
                }
            }

            $leader = $member?->structure?->leader?->user;
            if ($leader && $this->canContact($actor, $leader)) {
                $seen[$leader->id] = true;
            }

            if ($member?->structure_id) {
                Member::query()
                    ->where('structure_id', $member->structure_id)
                    ->whereNotNull('user_id')
                    ->where('user_id', '!=', $actor->id)
                    ->with(['user.role', 'user.member'])
                    ->limit(200)
                    ->get()
                    ->each(function (Member $peer) use ($actor, &$seen) {
                        if ($peer->user && $this->canContact($actor, $peer->user)) {
                            $seen[$peer->user->id] = true;
                        }
                    });
            }

            return array_map('intval', array_keys($seen));
        }

        User::query()
            ->where('is_active', true)
            ->where('id', '!=', $actor->id)
            ->whereHas('role', fn ($q) => $q->where('scope_level', '<', 4))
            ->with(['role', 'member', 'province', 'city', 'structure'])
            ->limit(300)
            ->get()
            ->each(function (User $user) use ($actor, &$seen) {
                if ($this->canContact($actor, $user)) {
                    $seen[$user->id] = true;
                }
            });

        Member::query()
            ->visibleTo($actor)
            ->whereNotNull('user_id')
            ->where('user_id', '!=', $actor->id)
            ->with(['user.role', 'user.member', 'structure'])
            ->limit(300)
            ->get()
            ->each(function (Member $row) use ($actor, &$seen) {
                if ($row->user && $this->canContact($actor, $row->user)) {
                    $seen[$row->user->id] = true;
                }
            });

        return array_map('intval', array_keys($seen));
    }

    private function groupIdFor(User $actor, User $user): string
    {
        $level = $user->scopeLevel();
        if ($level >= 4 || $user->member_id) {
            return 'members';
        }
        if ($level === 0) {
            return 'national';
        }
        if ($level === 1) {
            return 'province';
        }
        if ($level === 2) {
            return 'city';
        }

        return 'local';
    }

    private function groupLabelFor(string $groupId, User $actor): string
    {
        return match ($groupId) {
            'national' => 'Administration nationale',
            'province' => 'Administration provinciale',
            'city' => 'Administration territoriale / ville',
            'local' => 'Responsable local / structure',
            default => $actor->scopeLevel() >= 4 ? 'Membres de ma structure' : 'Membres',
        };
    }

    /** @return \Illuminate\Support\Collection<int, User> */
    private function staffCoveringMember(?Member $member)
    {
        if (! $member) {
            return collect();
        }

        return User::query()
            ->where('is_active', true)
            ->whereHas('role', fn ($q) => $q->where('scope_level', '<', 4)->where('slug', '!=', RoleSlug::SuperAdmin->value))
            ->with(['role', 'member', 'province', 'city', 'structure'])
            ->where(function ($q) use ($member) {
                $q->whereHas('role', fn ($r) => $r->where('scope_level', 0));

                if ($member->province_id) {
                    $q->orWhere(function ($q) use ($member) {
                        $q->where('province_id', $member->province_id)
                            ->whereHas('role', fn ($r) => $r->where('scope_level', 1));
                    });
                }

                if ($member->city_id) {
                    $q->orWhere(function ($q) use ($member) {
                        $q->where('city_id', $member->city_id)
                            ->whereHas('role', fn ($r) => $r->where('scope_level', 2));
                    });
                }

                if ($member->structure_id) {
                    $q->orWhere(function ($q) use ($member) {
                        $q->where('structure_id', $member->structure_id)
                            ->whereHas('role', fn ($r) => $r->where('scope_level', 3));
                    });
                }
            })
            ->limit(80)
            ->get();
    }

    private function staffCoversMember(User $staff, ?Member $member): bool
    {
        if (! $member) {
            return false;
        }

        if ($staff->hasRole(RoleSlug::SuperAdmin)) {
            return false;
        }

        return match ($staff->scopeLevel()) {
            0 => true,
            1 => $staff->province_id !== null && $staff->province_id === $member->province_id,
            2 => $staff->city_id !== null && $staff->city_id === $member->city_id,
            3 => $staff->structure_id !== null && $staff->structure_id === $member->structure_id,
            default => false,
        };
    }

    private function sameStructure(User $a, User $b): bool
    {
        $left = $a->member?->structure_id ?? $a->structure_id;
        $right = $b->member?->structure_id ?? $b->structure_id;

        return $left !== null && $left === $right;
    }

    private function staffSharesScope(User $actor, User $target): bool
    {
        return match ($actor->scopeLevel()) {
            0 => true,
            1 => $actor->province_id !== null && (
                $target->province_id === $actor->province_id
                || $target->member?->province_id === $actor->province_id
            ),
            2 => $actor->city_id !== null && (
                $target->city_id === $actor->city_id
                || $target->member?->city_id === $actor->city_id
            ),
            3 => $actor->structure_id !== null && (
                $target->structure_id === $actor->structure_id
                || $target->member?->structure_id === $actor->structure_id
            ),
            default => false,
        };
    }

    public function canSeeUserPhoto(User $actor, User $target): bool
    {
        if ((int) $actor->id === (int) $target->id) {
            return true;
        }

        if ($this->canContact($actor, $target)) {
            return true;
        }

        if ($actor->hasRole(RoleSlug::SuperAdmin)) {
            return true;
        }

        return ChatParticipant::query()
            ->where('user_id', $actor->id)
            ->whereHas('conversation.participants', fn ($q) => $q->where('user_id', $target->id))
            ->exists();
    }

    /**
     * @param  iterable<\App\Models\ChatParticipant|User>  $people
     */
    public function classifyExchange(iterable $people): string
    {
        $levels = [];
        foreach ($people as $person) {
            $user = $person instanceof User ? $person : $person->user;
            if (! $user) {
                continue;
            }
            $user->loadMissing('role');
            $levels[] = $user->scopeLevel();
        }

        $hasMember = collect($levels)->contains(fn ($l) => $l >= 4);
        $hasStaff = collect($levels)->contains(fn ($l) => $l < 4);

        if ($hasMember && $hasStaff) {
            return 'chef_membre';
        }
        if ($hasMember) {
            return 'membre_membre';
        }

        return 'staff_staff';
    }

    /** @return array<string, mixed> */
    public function serializeContact(User $user): array
    {
        $user->loadMissing(['role', 'member', 'province', 'city', 'structure']);

        return [
            'id' => $user->id,
            'name' => $user->member?->full_name ?? $user->name,
            'role' => $user->role?->name,
            'role_slug' => $user->role?->slug,
            'photo_url' => $user->photoUrl(),
            'member_code' => $user->member?->member_code,
            'scope' => $user->structure?->name
                ?? $user->city?->name
                ?? $user->province?->name
                ?? $user->member?->structure?->name
                ?? null,
            'scope_level' => $user->scopeLevel(),
        ];
    }
}
