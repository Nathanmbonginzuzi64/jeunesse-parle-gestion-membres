<?php

namespace App\Http\Resources;

use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Attendance
 */
class AttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'method' => $this->method,
            'note' => $this->note,
            'recorded_at' => $this->recorded_at?->toIso8601String(),
            'member' => $this->whenLoaded('member', fn () => [
                'id' => $this->member->id,
                'member_code' => $this->member->member_code,
                'full_name' => $this->member->full_name,
                'photo_url' => $this->member->photo_path ? route('media.member-photo', ['member' => $this->member->member_code]) : null,
            ]),
            'activity' => $this->whenLoaded('activity', fn () => [
                'id' => $this->activity->id,
                'code' => $this->activity->code,
                'title' => $this->activity->title,
                'starts_at' => $this->activity->starts_at?->toIso8601String(),
            ]),
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
        ];
    }
}
