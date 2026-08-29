/** Payload WebAuthn capturé lors de l'inscription d'un membre (avant création du dossier). */

export type WebAuthnEnrollmentPayload = {
  enrollment_key: string;
  clientDataJSON: string;
  attestationObject: string;
  transports?: string[];
  device_name?: string;
};

export function hasWebAuthnEnrollment(
  payload: WebAuthnEnrollmentPayload | null | undefined,
): payload is WebAuthnEnrollmentPayload {
  return Boolean(
    payload?.enrollment_key && payload.clientDataJSON && payload.attestationObject,
  );
}
