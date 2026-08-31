/** Payload WebAuthn capturé lors de l'inscription d'un membre (avant création du dossier). */

export type WebAuthnEnrollmentPayload = {
  enrollment_key: string;
  /** Biométrie validée côté serveur juste après Windows Hello. */
  enrolled?: boolean;
  clientDataJSON?: string;
  attestationObject?: string;
  transports?: string[];
  device_name?: string;
};

export function hasWebAuthnEnrollment(
  payload: WebAuthnEnrollmentPayload | null | undefined,
): payload is WebAuthnEnrollmentPayload {
  return Boolean(
    payload?.enrollment_key &&
      (payload.enrolled || (payload.clientDataJSON && payload.attestationObject)),
  );
}
