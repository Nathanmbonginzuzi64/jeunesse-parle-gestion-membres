<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Carte membre enrichie pour les listes (/cards).
 *
 * @mixin \App\Models\MemberCard
 */
class MemberCardListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $member = $this->member;

        return array_merge(
            (new MemberCardResource($this))->toArray($request),
            [
                'member_id' => $member->id,
                'member_code' => $member->member_code,
                'full_name' => $member->full_name,
                'photo_url' => $member->photo_path
                    ? route('media.member-photo', ['member' => $member->member_code])
                    : null,
                'province' => $member->province
                    ? ['id' => $member->province->id, 'name' => $member->province->name]
                    : null,
            ],
        );
    }
}
