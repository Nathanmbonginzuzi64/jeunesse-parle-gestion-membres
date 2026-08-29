<?php

namespace App\Http\Requests;

use App\Enums\RoleSlug;
use App\Http\Requests\Concerns\DecodesWebAuthnEnrollment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    use DecodesWebAuthnEnrollment;

    public function authorize(): bool
    {
        /** @var User|null $target */
        $target = $this->route('user');

        return $target !== null && ($this->user()?->can('update', $target) ?? false);
    }

    protected function prepareForValidation(): void
    {
        $this->decodeWebAuthnEnrollmentInput();

        if (is_string($this->input('fingerprints'))) {
            $decoded = json_decode($this->input('fingerprints'), true);
            if (is_array($decoded)) {
                $this->merge(['fingerprints' => $decoded]);
            }
        }
    }

    public function rules(): array
    {
        /** @var User $target */
        $target = $this->route('user');

        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email:rfc', 'max:160', 'unique:users,email,'.$target->id],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone,'.$target->id],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'structure_id' => ['nullable', 'integer', 'exists:structures,id'],
            'is_active' => ['nullable', 'boolean'],
            'fingerprints' => ['nullable', 'array', 'min:6', 'max:6'],
            'fingerprints.*.slot' => ['required_with:fingerprints', 'string', 'max:40'],
            'fingerprints.*.template_hash' => ['required_with:fingerprints', 'string', 'min:8', 'max:255'],
            'fingerprints.*.captured_at' => ['nullable', 'date'],
            'webauthn_enrollment' => ['nullable', 'array'],
            'webauthn_enrollment.enrollment_key' => ['required_with:webauthn_enrollment', 'string', 'max:80'],
            'webauthn_enrollment.clientDataJSON' => ['required_with:webauthn_enrollment', 'string'],
            'webauthn_enrollment.attestationObject' => ['required_with:webauthn_enrollment', 'string'],
            'webauthn_enrollment.transports' => ['nullable', 'array'],
            'webauthn_enrollment.device_name' => ['nullable', 'string', 'max:120'],
            'fingerprint_enrollment' => ['nullable', 'string', 'in:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $roleId = $this->input('role_id');
            if (! $roleId) {
                return;
            }

            $role = Role::find($roleId);
            $author = $this->user();

            if ($role && $author && ! $author->hasRole(RoleSlug::SuperAdmin) && $role->scope_level < $author->scopeLevel()) {
                $v->errors()->add('role_id', 'Vous ne pouvez pas attribuer un rôle plus étendu que le vôtre.');
            }
        });
    }
}
