<?php

namespace App\Http\Requests;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Http\Requests\Concerns\ValidatesTerritorialScope;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreActivityRequest extends FormRequest
{
    use ValidatesTerritorialScope;

    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Activity::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->applyScopeDefaults();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:5000'],
            'type' => ['required', Rule::in(ActivityType::values())],
            'status' => ['nullable', Rule::in(ActivityStatus::values())],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'location' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
            'zone_id' => ['nullable', 'integer', 'exists:zones,id'],
            'avenue_id' => ['nullable', 'integer', 'exists:avenues,id'],
            'structure_id' => ['nullable', 'integer', 'exists:structures,id'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'is_public' => ['nullable', 'boolean'],
            'image' => [
                'nullable',
                'file',
                'mimes:'.implode(',', config('jeunesse.photo.mimes')),
                'max:'.config('jeunesse.photo.max_kilobytes'),
            ],
            'member_ids' => ['nullable', 'array', 'max:5000'],
            'member_ids.*' => ['integer', 'exists:members,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(fn (Validator $v) => $this->enforceTerritorialScope($v));
    }
}
