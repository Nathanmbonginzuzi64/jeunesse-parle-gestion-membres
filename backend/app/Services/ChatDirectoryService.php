<?php

namespace App\Services;

use App\Enums\RoleSlug;
use App\Models\ChatParticipant;
use App\Models\Member;
use App\Models\User;

/**
 * Graphe « qui peut écrire à qui » : périmètre territorial + rôle.
 * Jamais une liste nationale pour un membre.
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

    /** @return list<array{id: string, label: string, contacts: list<array<string, mixed>>}> */
    public function groupsFor(User $actor): array
    {
        $actor->loadMissing(['role', 'member.structure.leader.user', 'member.province', 'member.city']);

        $seen = [];
        $push = function (array &$bucket, User $user) use ($actor, &$seen): void {
            if (isset($seen[$user->id]) || ! $this->canContact($actor, $user)) {
                return;
            }
            $seen[$user->id] = true;
            $bucket[] = $this->serializeContact($user);
        };

        $national = $provincial = $city = $local = $peers = [];

        if ($actor->scopeLevel() >= 4) {
            $member = $actor->member;
            $staff = $this->staffCoveringMember($member);

            foreach ($staff as $user) {
                $level = $user->scopeLevel();
                if ($level === 0) {
                    $push($national, $user);
                } elseif ($level === 1) {
                    $push($provincial, $user);
                } elseif ($level === 2) {
                    $push($city, $user);
                } else {
                    $push($local, $user);
                }
            }

            if ($member?->structure_id) {
                $leader = $member->structure?->leader?->user;
                if ($leader) {
                    $push($local, $leader);
                }

                Member::query()
                    ->where('structure_id', $member->structure_id)
                    ->whereNotNull('user_id')
                    ->where('user_id', '!=', $actor->id)
                    ->with(['user.role', 'user.member'])
                    ->limit(40)
                    ->get()
                    ->each(function (Member $peer) use (&$peers, $push) {
                        if ($peer->user) {
                            $push($peers, $peer->user);
                        }
                    });
            }
        } else {
            User::query()
                ->where('is_active', true)
                ->where('id', '!=', $actor->id)
                ->whereHas('role', fn ($q) => $q->where('scope_level', '<', 4))
                ->with(['role', 'member', 'province', 'city', 'structure'])
                ->limit(80)
                ->get()
                ->each(function (User $user) use ($actor, &$national, &$provincial, &$city, &$local, $push) {
                    if (! $this->staffSharesScope($actor, $user) && ! $actor->hasRole(RoleSlug::SuperAdmin)) {
                        return;
                    }
                    $level = $user->scopeLevel();
                    if ($level === 0) {
                        $push($national, $user);
                    } elseif ($level === 1) {
                        $push($provincial, $user);
                    } elseif ($level === 2) {
                        $push($city, $user);
                    } else {
                        $push($local, $user);
                    }
                });

            Member::query()
                ->visibleTo($actor)
                ->whereNotNull('user_id')
                ->where('user_id', '!=', $actor->id)
                ->with(['user.role', 'user.member', 'structure'])
                ->orderBy('last_name')
                ->limit(60)
                ->get()
                ->each(function (Member $row) use (&$peers, $push) {
                    if ($row->user) {
                        $push($peers, $row->user);
                    }
                });
        }

        return array_values(array_filter([
            ['id' => 'national', 'label' => 'Administration nationale', 'contacts' => $national],
            ['id' => 'province', 'label' => 'Administration provinciale', 'contacts' => $provincial],
            ['id' => 'city', 'label' => 'Administration territoriale / ville', 'contacts' => $city],
            ['id' => 'local', 'label' => 'Responsable local / structure', 'contacts' => $local],
            ['id' => 'members', 'label' => $actor->scopeLevel() >= 4 ? 'Membres de ma structure' : 'Membres du périmètre', 'contacts' => $peers],
        ], fn (array $group) => $group['contacts'] !== []));
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
            ->limit(50)
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

        return ChatParticipant::query()
            ->where('user_id', $actor->id)
            ->whereHas('conversation.participants', fn ($q) => $q->where('user_id', $target->id))
            ->exists();
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
        ];
    }
}
