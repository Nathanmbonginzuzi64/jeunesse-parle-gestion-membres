<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_active' => $this->is_active,
            'must_change_password' => $this->must_change_password,
            'must_confirm_biometric' => $this->must_confirm_biometric,
            'role' => $this->role ? [
                'slug' => $this->role->slug,
                'name' => $this->role->name,
                'scope_level' => $this->role->scope_level,
            ] : null,
            'scope' => [
                'province_id' => $this->province_id,
                'province' => $this->whenLoaded('province', fn () => $this->province?->name),
                'city_id' => $this->city_id,
                'city' => $this->whenLoaded('city', fn () => $this->city?->name),
                'commune_id' => $this->commune_id,
                'structure_id' => $this->structure_id,
                'structure' => $this->whenLoaded('structure', fn () => $this->structure?->name),
            ],
            'member_id' => $this->member_id,
            'member_code' => $this->whenLoaded('member', fn () => $this->member?->member_code),
            'fingerprint_enrolled' => app(\App\Services\BiometricService::class)->userIsEnrolled($this->resource),
            'permissions' => $this->when(
                $request->user()?->id === $this->id,
                fn () => $this->permissionSlugs()->values(),
            ),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
