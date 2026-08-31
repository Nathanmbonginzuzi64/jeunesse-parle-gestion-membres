<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RecordFingerprintAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('recordAttendance', $this->route('activity')) ?? false;
    }

    public function rules(): array
    {
        return [
            'member_code' => ['nullable', 'string', 'max:40'],
            'template_hash' => ['nullable', 'string', 'min:8', 'max:255'],
            'format' => ['nullable', 'string', 'in:hardware,simulation'],
        ];
    }
}
