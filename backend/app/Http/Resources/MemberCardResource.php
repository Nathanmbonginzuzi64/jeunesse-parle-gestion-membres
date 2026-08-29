<?php

namespace App\Http\Resources;

use App\Models\MemberCard;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MemberCard
 */
class MemberCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'card_number' => $this->card_number,
            'sequence' => $this->sequence,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_reason' => $this->status_reason,
            'issued_at' => $this->issued_at?->toDateString(),
            'expires_at' => $this->expires_at?->toDateString(),
            'is_valid' => $this->isValid(),
            'template_version' => $this->template_version,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
