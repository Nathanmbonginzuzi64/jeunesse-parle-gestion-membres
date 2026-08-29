<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesTerritorialScope;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStructureRequest extends FormRequest
{
    use ValidatesTerritorialScope;

    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Structure::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->applyScopeDefaults();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'type' => ['required', Rule::in([
                'coordination_nationale', 'coordination_provinciale', 'antenne', 'cellule', 'club',
            ])],
            'description' => ['nullable', 'string', 'max:2000'],
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'zone_id' => ['nullable', 'integer', 'exists:zones,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'contact_email' => ['nullable', 'email:rfc', 'max:160'],
            'leader_member_id' => ['nullable', 'integer', 'exists:members,id'],
            'created_on' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->enforceTerritorialScope($v));
    }
}
