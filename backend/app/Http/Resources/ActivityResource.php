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
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'capacity' => $this->capacity,
            'is_public' => $this->is_public,
            'image_url' => $this->image_path
                ? url('/api/media/activities/'.rawurlencode($this->code).'/image')
                : null,
            'province' => $this->whenLoaded('province', fn () => $this->province ? ['id' => $this->province->id, 'name' => $this->province->name] : null),
            'city' => $this->whenLoaded('city', fn () => $this->city ? ['id' => $this->city->id, 'name' => $this->city->name] : null),
            'commune' => $this->whenLoaded('commune', fn () => $this->commune ? ['id' => $this->commune->id, 'name' => $this->commune->name] : null),
            'zone' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name] : null),
            'quartier' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name] : null),
            'avenue' => $this->whenLoaded('avenue', fn () => $this->avenue ? ['id' => $this->avenue->id, 'name' => $this->avenue->name] : null),
            'structure' => $this->whenLoaded('structure', fn () => $this->structure ? ['id' => $this->structure->id, 'name' => $this->structure->name] : null),
            'organizer' => $this->whenLoaded('organizer', fn () => $this->organizer ? ['id' => $this->organizer->id, 'name' => $this->organizer->name] : null),
            'live_location' => [
                'active' => (bool) $this->live_location_active,
                'latitude' => $this->live_latitude,
                'longitude' => $this->live_longitude,
                'updated_at' => $this->live_updated_at?->toIso8601String(),
                'shared_by' => $this->relationLoaded('liveSharer')
                    ? $this->liveSharer?->name
                    : null,
            ],
            'participants_count' => $this->whenCounted('members'),
            'attendances_count' => $this->whenCounted('attendances'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
