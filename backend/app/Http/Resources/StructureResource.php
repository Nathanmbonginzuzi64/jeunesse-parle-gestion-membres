<?php

namespace App\Http\Resources;

use App\Models\Structure;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Structure
 */
class StructureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type,
            'description' => $this->description,
            'address' => $this->address,
            'contact_phone' => $this->contact_phone,
            'contact_email' => $this->contact_email,
            'is_active' => $this->is_active,
            'province' => $this->whenLoaded('province', fn () => $this->province ? ['id' => $this->province->id, 'name' => $this->province->name] : null),
            'city' => $this->whenLoaded('city', fn () => $this->city ? ['id' => $this->city->id, 'name' => $this->city->name] : null),
            'commune' => $this->whenLoaded('commune', fn () => $this->commune ? ['id' => $this->commune->id, 'name' => $this->commune->name] : null),
            'zone' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name] : null),
            'leader' => $this->whenLoaded('leader', fn () => $this->leader ? ['id' => $this->leader->id, 'full_name' => $this->leader->full_name, 'member_code' => $this->leader->member_code] : null),
            'members_count' => $this->whenCounted('members'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
