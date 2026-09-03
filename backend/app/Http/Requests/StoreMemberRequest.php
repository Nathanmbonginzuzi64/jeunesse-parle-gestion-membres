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

class StoreMemberRequest extends FormRequest
{
    use ValidatesTerritorialScope;
    use ValidatesWebAuthnEnrollment;

    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Member::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'phone' => $this->normalizePhone($this->input('phone')),
            'phone_alt' => $this->normalizePhone($this->input('phone_alt')),
            'email' => $this->input('email') ? mb_strtolower(trim($this->input('email'))) : null,
        ], fn ($v) => $v !== null));

        if (is_string($this->input('fingerprints'))) {
            $decoded = json_decode($this->input('fingerprints'), true);
            if (is_array($decoded)) {
                $this->merge(['fingerprints' => $decoded]);
            }
        }

        $this->decodeWebAuthnEnrollmentInput();

        $this->applyScopeDefaults();
    }

    public function rules(): array
    {
        $minAge = (int) Setting::get('membership.minimum_age', config('jeunesse.minimum_age'));
        $maxAge = (int) Setting::get('membership.maximum_age', config('jeunesse.maximum_age'));

        return [
            'last_name' => ['required', 'string', 'max:80'],
            'middle_name' => ['nullable', 'string', 'max:80'],
            'first_name' => ['required', 'string', 'max:80'],
            'gender' => ['required', Rule::in(Gender::values())],
            'birth_date' => [
                'nullable', 'date',
                'before_or_equal:'.now()->subYears($minAge)->toDateString(),
                'after_or_equal:'.now()->subYears($maxAge + 1)->toDateString(),
            ],
            'birth_place' => ['nullable', 'string', 'max:120'],

            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9]{9,15}$/', 'unique:users,phone'],
            'phone_alt' => ['nullable', 'string', 'max:30', 'regex:/^\+?[0-9]{9,15}$/'],
            'email' => ['nullable', 'email:rfc', 'max:160', 'unique:users,email'],

            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'address' => ['nullable', 'string', 'max:255'],
            'house_number' => ['nullable', 'string', 'max:40'],

            'province_id' => ['required', 'integer', 'exists:provinces,id'],
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

            'consent_given' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],

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

            'webauthn_enrollment' => ['required_without:fingerprints', 'nullable', 'array'],
            'webauthn_enrollment.enrollment_key' => ['required_with:webauthn_enrollment', 'string', 'max:80'],
            'webauthn_enrollment.clientDataJSON' => ['nullable', 'string'],
            'webauthn_enrollment.attestationObject' => ['nullable', 'string'],
            'webauthn_enrollment.transports' => ['nullable', 'array'],
            'webauthn_enrollment.device_name' => ['nullable', 'string', 'max:120'],

            // Permet de forcer l'acceptation malgré une alerte de doublon.
            'confirm_duplicate' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->enforceTerritorialScope($v));
        $validator->after(function (Validator $v) {
            $this->assertTerritorialConsistency($v);
            $this->assertPendingWebAuthnEnrollment($v);
        });
    }

    /** Vérifie que ville / commune / zone appartiennent bien à la province indiquée. */
    protected function assertTerritorialConsistency(Validator $validator): void
    {
        $provinceId = (int) $this->input('province_id');

        if ($cityId = $this->input('city_id')) {
            $city = \App\Models\City::find($cityId);
            if ($city && $city->province_id !== $provinceId) {
                $validator->errors()->add('city_id', 'Cette ville n\'appartient pas à la province sélectionnée.');
            }
        }

        if ($communeId = $this->input('commune_id')) {
            $commune = \App\Models\Commune::find($communeId);
            if ($commune && $this->input('city_id') && $commune->city_id !== (int) $this->input('city_id')) {
                $validator->errors()->add('commune_id', 'Cette commune n\'appartient pas à la ville sélectionnée.');
            }
        }

        if ($zoneId = $this->input('zone_id')) {
            $zone = \App\Models\Zone::find($zoneId);
            if ($zone && $this->input('commune_id') && $zone->commune_id !== (int) $this->input('commune_id')) {
                $validator->errors()->add('zone_id', 'Ce quartier n\'appartient pas à la commune sélectionnée.');
            }
        }
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Le numéro de téléphone doit contenir entre 9 et 15 chiffres.',
            'phone.unique' => 'Ce numéro de téléphone est déjà utilisé pour un compte portail.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée pour un compte portail.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'birth_date.before_or_equal' => 'L\'âge minimum d\'adhésion est de '.$minAge.' ans.',
            'birth_date.after_or_equal' => 'L\'âge maximum d\'adhésion est de '.$maxAge.' ans.',
        ];
    }

    protected function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $clean = preg_replace('/[\s().-]+/', '', trim($phone));

        return $clean ?: null;
    }
}
