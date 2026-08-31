<?php

namespace App\Http\Requests\Concerns;

use App\Services\ContextualBiometricService;
use Illuminate\Contracts\Validation\Validator;

trait ValidatesWebAuthnEnrollment
{
    protected function decodeWebAuthnEnrollmentInput(): void
    {
        if (is_string($this->input('webauthn_enrollment'))) {
            $decoded = json_decode($this->input('webauthn_enrollment'), true);
            if (is_array($decoded)) {
                $this->merge(['webauthn_enrollment' => $decoded]);
            }
        }
    }

    protected function assertPendingWebAuthnEnrollment(Validator $validator): void
    {
        $enrollment = $this->input('webauthn_enrollment');

        if (! is_array($enrollment) || empty($enrollment['enrollment_key'])) {
            return;
        }

        if (! empty($enrollment['clientDataJSON'])) {
            return;
        }

        $service = app(ContextualBiometricService::class);

        if (! $service->hasPendingEnrollment((string) $enrollment['enrollment_key'])) {
            $validator->errors()->add(
                'webauthn_enrollment',
                'L\'enregistrement biométrique a expiré. Reconfigurez Windows Hello puis réessayez.',
            );
        }
    }
}
