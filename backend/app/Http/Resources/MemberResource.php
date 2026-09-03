<?php

namespace App\Http\Resources;

use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Member
 */
class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();
        $canSeeSensitive = $viewer !== null && $viewer->can('viewSensitive', $this->resource);

        return [
            'id' => $this->id,
            'member_code' => $this->member_code,
            'full_name' => $this->full_name,
            'last_name' => $this->last_name,
            'middle_name' => $this->middle_name,
            'first_name' => $this->first_name,
            'gender' => $this->gender?->value,
            'gender_label' => $this->gender?->label(),
            'age' => $this->age,
            'photo_url' => $this->photo_path ? route('media.member-photo', ['member' => $this->member_code]) : null,

            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_reason' => $this->status_reason,

            'province' => $this->whenLoaded('province', fn () => ['id' => $this->province->id, 'name' => $this->province->name]),
            'city' => $this->whenLoaded('city', fn () => $this->city ? ['id' => $this->city->id, 'name' => $this->city->name] : null),
            'commune' => $this->whenLoaded('commune', fn () => $this->commune ? ['id' => $this->commune->id, 'name' => $this->commune->name] : null),
            'zone' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name] : null),
            'quartier' => $this->whenLoaded('zone', fn () => $this->zone ? ['id' => $this->zone->id, 'name' => $this->zone->name] : null),
            'avenue' => $this->whenLoaded('avenue', fn () => $this->avenue ? ['id' => $this->avenue->id, 'name' => $this->avenue->name] : null),
            'structure' => $this->whenLoaded('structure', fn () => $this->structure ? ['id' => $this->structure->id, 'name' => $this->structure->name, 'code' => $this->structure->code] : null),

            'position' => $this->position,
            'profession' => $this->profession,
            'joined_at' => $this->joined_at?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'fingerprint_enrolled' => $this->webAuthnCredentials()->exists()
                || $this->biometricTemplates()
                    ->where('modality', 'fingerprint')
                    ->where('status', 'enrolled')
                    ->exists(),
            'has_portal_account' => (bool) $this->user_id,
            'user_id' => $this->user_id,
            'fingerprints_count' => $this->webAuthnCredentials()->exists()
                ? 1
                : $this->biometricTemplates()
                    ->where('modality', 'fingerprint')
                    ->where('status', 'enrolled')
                    ->count(),

            // Les coordonnées ne quittent l'API que pour un porteur de permission
            // ou pour le membre lui-même.
            $this->mergeWhen($canSeeSensitive, fn () => [
                'phone' => $this->phone,
                'phone_alt' => $this->phone_alt,
                'email' => $this->email,
                'address' => $this->address,
                'house_number' => $this->house_number,
                'birth_date' => $this->birth_date?->toDateString(),
                'birth_place' => $this->birth_place,
                'education_level' => $this->education_level,
                'employment_status' => $this->employment_status,
                'activity_domain' => $this->activity_domain,
                'skills' => $this->skills ?? [],
                'interests' => $this->interests ?? [],
                'notes' => $this->notes,
                'validated_at' => $this->validated_at?->toIso8601String(),
                'consent_given' => $this->consent_given,
            ]),

            'card' => new MemberCardResource($this->whenLoaded('activeCard')),
        ];
    }
}
