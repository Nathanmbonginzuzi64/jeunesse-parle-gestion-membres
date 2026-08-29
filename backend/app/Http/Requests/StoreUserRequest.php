<?php

namespace App\Http\Requests;

use App\Enums\RoleSlug;
use App\Models\Role;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\User::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:160', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone'],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()->symbols()],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'structure_id' => ['nullable', 'integer', 'exists:structures,id'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $role = Role::find($this->input('role_id'));

            if (! $role) {
                return;
            }

            // Un rôle territorial est inutilisable sans le périmètre correspondant.
            $required = match ($role->scope_level) {
                1 => 'province_id',
                2 => 'city_id',
                3 => 'structure_id',
                default => null,
            };

            if ($required && ! $this->input($required)) {
                $v->errors()->add($required, 'Ce rôle exige un périmètre territorial.');
            }

            // Nul ne peut créer un compte plus puissant que le sien.
            $author = $this->user();

            if ($role->slug === RoleSlug::SuperAdmin->value && ! $author?->hasRole(RoleSlug::SuperAdmin)) {
                $v->errors()->add('role_id', 'Vous ne pouvez pas attribuer ce rôle.');
            }

            if ($author && ! $author->isNationalScope() && $role->scope_level < $author->scopeLevel()) {
                $v->errors()->add('role_id', 'Vous ne pouvez pas attribuer un rôle plus étendu que le vôtre.');
            }
        });
    }
}
