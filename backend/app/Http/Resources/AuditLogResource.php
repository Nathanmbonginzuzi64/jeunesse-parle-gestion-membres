<?php

namespace App\Http\Resources;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'description' => $this->description,
            'subject_type' => $this->auditable_type ? class_basename($this->auditable_type) : null,
            'subject_id' => $this->auditable_id,
            'old_values' => $this->old_values,
            'new_values' => $this->new_values,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'portal' => $this->resolvedPortal(),
            'request_path' => $this->request_path,
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'role' => $this->user->relationLoaded('role') && $this->user->role
                    ? [
                        'name' => $this->user->role->name,
                        'slug' => $this->user->role->slug,
                    ]
                    : null,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
