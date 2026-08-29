<?php

namespace App\Http\Resources;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Activity
 */
class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'location' => $this->location,
            'capacity' => $this->capacity,
            'is_public' => $this->is_public,
            'province' => $this->whenLoaded('province', fn () => $this->province ? ['id' => $this->province->id, 'name' => $this->province->name] : null),
            'structure' => $this->whenLoaded('structure', fn () => $this->structure ? ['id' => $this->structure->id, 'name' => $this->structure->name] : null),
            'organizer' => $this->whenLoaded('organizer', fn () => $this->organizer ? ['id' => $this->organizer->id, 'name' => $this->organizer->name] : null),
            'participants_count' => $this->whenCounted('members'),
            'attendances_count' => $this->whenCounted('attendances'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
