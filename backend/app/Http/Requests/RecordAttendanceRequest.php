<?php

namespace App\Http\Requests;

use App\Enums\AttendanceStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecordAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('recordAttendance', $this->route('activity')) ?? false;
    }

    public function rules(): array
    {
        return [
            // Trois façons d'identifier le membre : scan QR, code membre ou identifiant.
            'qr_token' => ['nullable', 'string', 'max:64', 'required_without_all:member_id,member_code'],
            'member_code' => ['nullable', 'string', 'max:20', 'required_without_all:member_id,qr_token'],
            'member_id' => ['nullable', 'integer', 'exists:members,id', 'required_without_all:qr_token,member_code'],
            'status' => ['nullable', Rule::in(AttendanceStatus::values())],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'qr_token.required_without_all' => 'Identifiez le membre par QR code, code membre ou identifiant.',
        ];
    }
}
