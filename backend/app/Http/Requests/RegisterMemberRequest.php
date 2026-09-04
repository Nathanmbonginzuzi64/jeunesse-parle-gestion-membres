<?php

namespace App\Http\Requests;

use App\Enums\Gender;
use App\Http\Requests\Concerns\ValidatesWebAuthnEnrollment;
use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Contracts\Validation\Validator;

/**
 * Inscription publique d'un membre : crée à la fois le compte et le dossier,
 * qui reste « en attente » jusqu'à validation par un responsable.
 */
class RegisterMemberRequest extends FormRequest
{
    use ValidatesWebAuthnEnrollment;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => preg_replace('/[\s().-]+/', '', (string) $this->input('phone')),
            'email' => $this->input('email') ? mb_strtolower(trim($this->input('email'))) : null,
        ]);

        if (is_string($this->input('fingerprints'))) {
            $decoded = json_decode($this->input('fingerprints'), true);
            if (is_array($decoded)) {
                $this->merge(['fingerprints' => $decoded]);
            }
        }

        foreach (['skills', 'interests'] as $listKey) {
            if (is_string($this->input($listKey))) {
                $decoded = json_decode($this->input($listKey), true);
                if (is_array($decoded)) {
                    $this->merge([$listKey => $decoded]);
                }
            }
        }

        $this->decodeWebAuthnEnrollmentInput();
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $this->assertPendingWebAuthnEnrollment($v);

            $portal = strtolower((string) $this->header('X-Client-Portal', 'web'));
            $hasFingerprints = is_array($this->input('fingerprints')) && count($this->input('fingerprints')) > 0;
            $hasWebAuthn = is_array($this->input('webauthn_enrollment'))
                && filled(data_get($this->input('webauthn_enrollment'), 'enrollment_key'));

            // Portail web : au moins une biométrie (aligné sur le formulaire).
            // Mobile : biométrie optionnelle (complétion possible plus tard).
            if ($portal === 'web' && ! $hasFingerprints && ! $hasWebAuthn) {
                $v->errors()->add(
                    'webauthn_enrollment',
                    'Enregistrez Windows Hello ou les empreintes digitales pour finaliser l’adhésion.',
                );
            }
        });
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
                'required', 'date',
                'before_or_equal:'.now()->subYears($minAge)->toDateString(),
                'after_or_equal:'.now()->subYears($maxAge + 1)->toDateString(),
            ],
            'birth_place' => ['nullable', 'string', 'max:120'],

            'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9]{9,15}$/', 'unique:users,phone'],
            'email' => ['nullable', 'email:rfc', 'max:160', 'unique:users,email'],
            'address' => ['nullable', 'string', 'max:255'],
            'house_number' => ['nullable', 'string', 'max:40'],

            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],

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

            'consent_given' => ['accepted'],
            'confirm_duplicate' => ['nullable', 'boolean'],

            'device_name' => ['nullable', 'string', 'max:60'],

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

    public function messages(): array
    {
        $minAge = (int) Setting::get('membership.minimum_age', config('jeunesse.minimum_age'));
        $maxAge = (int) Setting::get('membership.maximum_age', config('jeunesse.maximum_age'));

        return [
            'phone.unique' => 'Le numéro de téléphone est déjà utilisé.',
            'email.unique' => 'L\'adresse e-mail est déjà utilisée.',
            'phone.regex' => 'Le numéro de téléphone doit contenir entre 9 et 15 chiffres.',
            'consent_given.accepted' => 'Vous devez accepter le traitement de vos données pour adhérer.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
            'password.*' => 'Le mot de passe doit contenir au moins 8 caractères, avec des lettres et des chiffres.',
            'birth_date.before_or_equal' => 'L\'âge minimum d\'adhésion est de '.$minAge.' ans.',
            'birth_date.after_or_equal' => 'L\'âge maximum d\'adhésion est de '.$maxAge.' ans.',
            'fingerprints.min' => 'Capturez les 6 empreintes digitales.',
            'province_id.required' => 'Sélectionnez votre province.',
            'gender.required' => 'Indiquez votre sexe.',
            'last_name.required' => 'Le nom est obligatoire.',
            'first_name.required' => 'Le prénom est obligatoire.',
            'birth_date.required' => 'La date de naissance est obligatoire.',
            'phone.required' => 'Le numéro de téléphone est obligatoire.',
        ];
    }
}
