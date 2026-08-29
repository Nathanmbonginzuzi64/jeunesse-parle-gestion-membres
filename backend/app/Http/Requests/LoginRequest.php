<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Identifiant unique : e-mail ou numéro de téléphone.
            'login' => ['required', 'string', 'max:160'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:60'],
        ];
    }

    public function messages(): array
    {
        return [
            'login.required' => 'Veuillez saisir votre e-mail ou votre numéro de téléphone.',
            'password.required' => 'Veuillez saisir votre mot de passe.',
        ];
    }
}
