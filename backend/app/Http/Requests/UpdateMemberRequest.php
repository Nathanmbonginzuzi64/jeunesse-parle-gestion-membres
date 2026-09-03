<?php

namespace App\Http\Requests;

use App\Enums\Gender;
use App\Http\Requests\Concerns\ValidatesTerritorialScope;
use App\Http\Requests\Concerns\ValidatesWebAuthnEnrollment;
use App\Models\Setting;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateMemberRequest extends FormRequest
{
    use ValidatesTerritorialScope;
    use ValidatesWebAuthnEnrollment;

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('member')) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'phone' => $this->has('phone') ? preg_replace('/[\s().-]+/', '', (string) $this->input('phone')) : null,
            'phone_alt' => $this->has('phone_alt') ? preg_replace('/[\s().-]+/', '', (string) $this->input('phone_alt')) : null,
            'email' => $this->input('email') ? mb_strtolower(trim($this->input('email'))) : null,
        ], fn ($v) => $v !== null && $v !== ''));

        if (is_string($this->input('fingerprints'))) {
            $decoded = json_decode($this->input('fingerprints'), true);
            if (is_array($decoded)) {
                $this->merge(['fingerprints' => $decoded]);
            }
        }

        $this->decodeWebAuthnEnrollmentInput();
    }

    public function rules(): array
    {
        $minAge = (int) Setting::get('membership.minimum_age', config('jeunesse.minimum_age'));
        $maxAge = (int) Setting::get('membership.maximum_age', config('jeunesse.maximum_age'));

        return [
            'last_name' => ['sometimes', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'first_name' => ['sometimes', 'string', 'max:80'],
            'gender' => ['sometimes', Rule::in(Gender::values())],
            'birth_date' => [
                'nullable', 'date',
                'before_or_equal:'.now()->subYears($minAge)->toDateString(),
                'after_or_equal:'.now()->subYears($maxAge + 1)->toDateString(),
            ],
            'birth_place' => ['nullable', 'string', 'max:120'],

            'phone' => ['sometimes', 'string', 'max:30', 'regex:/^\+?[0-9]{9,15}$/'],
            'phone_alt' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9]{9,15}$/'],
            'email' => ['nullable', 'email:rfc', 'max:160'],
            'address' => ['nullable', 'string', 'max:255'],
            'house_number' => ['nullable', 'string', 'max:40'],

            'province_id' => ['sometimes', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'zone_id' => ['nullable', 'integer', 'exists:zones,id'],
            'avenue_id' => ['nullable', 'integer', 'exists:avenues,id'],
            'structure_id' => ['nullable', 'integer', 'exists:structures,id'],

            'education_level' => ['nullable', 'string', 'max:60'],
            'profession' => ['nullable', 'string', 'max:120'],
            'employment_status' => ['nullable', 'string', 'max:60'],
            'activity_domain' => ['nullable', 'string', 'max:120'],
            'skills' => ['nullable', 'array', 'max:30'],
            'skills.*' => ['string', 'max:60'],
            'interests' => ['nullable', 'array', 'max:30'],
            'interests.*' => ['string', 'max:60'],

            'position' => ['nullable', 'string', 'max:120'],
            'supervisor_member_id' => ['nullable', 'integer', 'exists:members,id'],
            'joined_at' => ['nullable', 'date', 'before_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:2000'],

            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],

            'photo' => [
                'nullable', 'file',
                'mimes:'.implode(',', config('jeunesse.photo.mimes')),
                'max:'.config('jeunesse.photo.max_kilobytes'),
            ],

            'fingerprints' => ['nullable', 'array', 'min:6', 'max:6'],
            'fingerprints.*.slot' => ['required_with:fingerprints', 'string', 'max:40'],
            'fingerprints.*.template_hash' => ['required_with:fingerprints', 'string', 'min:8', 'max:255'],
            'fingerprints.*.hand' => ['nullable', 'string', 'max:20'],
            'fingerprints.*.finger' => ['nullable', 'string', 'max:40'],
            'fingerprints.*.captured_at' => ['nullable', 'date'],

            'webauthn_enrollment' => ['nullable', 'array'],
            'webauthn_enrollment.enrollment_key' => ['required_with:webauthn_enrollment', 'string', 'max:80'],
            'webauthn_enrollment.clientDataJSON' => ['nullable', 'string'],
            'webauthn_enrollment.attestationObject' => ['nullable', 'string'],
            'webauthn_enrollment.transports' => ['nullable', 'array'],
            'webauthn_enrollment.device_name' => ['nullable', 'string', 'max:120'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $this->enforceTerritorialScope($v);
            $this->assertPendingWebAuthnEnrollment($v);
        });
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Le numéro de téléphone doit contenir entre 9 et 15 chiffres.',
        ];
    }
}
