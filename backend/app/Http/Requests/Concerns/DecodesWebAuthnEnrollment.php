<?php

namespace App\Http\Requests\Concerns;

trait DecodesWebAuthnEnrollment
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
}
