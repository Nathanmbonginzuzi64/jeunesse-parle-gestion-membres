/** Client WebAuthn — conversion base64url ↔ ArrayBuffer pour Windows Hello. */

function b64urlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function reviveCreateOptions(publicKey: Record<string, unknown>): PublicKeyCredentialCreationOptions {
  const pk = structuredClone(publicKey) as Record<string, unknown>;
  const challenge = pk.challenge;
  if (typeof challenge === "string") pk.challenge = b64urlToBuffer(challenge);
  else if (challenge && typeof challenge === "object" && "base64" in (challenge as object)) {
    pk.challenge = b64urlToBuffer(String((challenge as { base64: string }).base64));
  }

  const user = pk.user as Record<string, unknown> | undefined;
  if (user && typeof user.id === "string") user.id = b64urlToBuffer(user.id);
  else if (user && user.id && typeof user.id === "object" && "base64" in (user.id as object)) {
    user.id = b64urlToBuffer(String((user.id as { base64: string }).base64));
  }

  const exclude = pk.excludeCredentials as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(exclude)) {
    pk.excludeCredentials = exclude.map((item) => {
      const id = item.id;
      if (typeof id === "string") return { ...item, id: b64urlToBuffer(id) };
      if (id && typeof id === "object" && "base64" in id) {
        return { ...item, id: b64urlToBuffer(String((id as { base64: string }).base64)) };
      }
      return item;
    });
  }

  return pk as unknown as PublicKeyCredentialCreationOptions;
}

function reviveGetOptions(publicKey: Record<string, unknown>): PublicKeyCredentialRequestOptions {
  const pk = structuredClone(publicKey) as Record<string, unknown>;
  const challenge = pk.challenge;
  if (typeof challenge === "string") pk.challenge = b64urlToBuffer(challenge);
  else if (challenge && typeof challenge === "object" && "base64" in (challenge as object)) {
    pk.challenge = b64urlToBuffer(String((challenge as { base64: string }).base64));
  }

  const allow = pk.allowCredentials as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(allow) && allow.length > 0) {
    pk.allowCredentials = allow.map((item) => {
      const id = item.id;
      if (typeof id === "string") return { ...item, id: b64urlToBuffer(id) };
      if (id && typeof id === "object" && "base64" in id) {
        return { ...item, id: b64urlToBuffer(String((id as { base64: string }).base64)) };
      }
      return item;
    });
  } else {
    delete pk.allowCredentials;
  }

  if (pk.userVerification === "required") {
    pk.userVerification = "preferred";
  }

  return pk as unknown as PublicKeyCredentialRequestOptions;
}

export function isWebAuthnAvailable(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** Windows Hello exige que l'onglet ait le focus au moment de l'appel. */
export async function ensureDocumentFocus(): Promise<void> {
  if (typeof document === "undefined") return;

  if (document.hasFocus()) return;

  window.focus();

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  if (!document.hasFocus()) {
    throw new WebAuthnFocusError();
  }
}

export class WebAuthnFocusError extends Error {
  constructor() {
    super(
      "La fenêtre du navigateur doit être active. Cliquez sur « Lancer Windows Hello » sans changer d'onglet.",
    );
    this.name = "WebAuthnFocusError";
  }
}

export function isWebAuthnFocusError(error: unknown): boolean {
  if (error instanceof WebAuthnFocusError) return true;
  if (!(error instanceof DOMException || error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "NotAllowedError" &&
    (message.includes("page does not have focus") ||
      message.includes("document is not focused") ||
      message.includes("operation is not allowed"))
  );
}

export function formatWebAuthnError(error: unknown): string {
  if (error instanceof WebAuthnFocusError) return error.message;
  if (isWebAuthnFocusError(error)) {
    return "La fenêtre du navigateur doit être active. Cliquez sur « Lancer Windows Hello » sans changer d'onglet.";
  }
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Windows Hello a refusé l'opération. Vérifiez que le membre a bien enregistré sa biométrie sur cet appareil, puis réessayez sans changer d'onglet.";
  }
  if (error instanceof Error) return error.message;
  return "Opération biométrique impossible.";
}

export async function webAuthnCreate(
  serverOptions: { publicKey?: Record<string, unknown> } | Record<string, unknown>,
): Promise<{
  clientDataJSON: string;
  attestationObject: string;
  transports?: string[];
}> {
  if (!isWebAuthnAvailable()) {
    throw new Error("Biométrie indisponible sur cet appareil.");
  }

  const root = serverOptions as { publicKey?: Record<string, unknown> };
  const publicKey = reviveCreateOptions(root.publicKey ?? (serverOptions as Record<string, unknown>));

  try {
    await ensureDocumentFocus();
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!credential) throw new Error("Enregistrement biométrique annulé.");

    const response = credential.response as AuthenticatorAttestationResponse;
    const transports =
      typeof response.getTransports === "function" ? response.getTransports() : ["internal"];

    return {
      clientDataJSON: bufferToB64url(response.clientDataJSON),
      attestationObject: bufferToB64url(response.attestationObject),
      transports,
    };
  } catch (error) {
    if (isWebAuthnFocusError(error)) throw new WebAuthnFocusError();
    throw error;
  }
}

export async function webAuthnGet(
  serverOptions: { publicKey?: Record<string, unknown> } | Record<string, unknown>,
): Promise<{
  id: string;
  rawId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string | null;
}> {
  if (!isWebAuthnAvailable()) {
    throw new Error("Biométrie indisponible sur cet appareil.");
  }

  const root = serverOptions as { publicKey?: Record<string, unknown> };
  const publicKey = reviveGetOptions(root.publicKey ?? (serverOptions as Record<string, unknown>));

  try {
    await ensureDocumentFocus();
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
    if (!credential) throw new Error("Identification biométrique annulée.");

    const response = credential.response as AuthenticatorAssertionResponse;

    return {
      id: bufferToB64url(credential.rawId),
      rawId: bufferToB64url(credential.rawId),
      clientDataJSON: bufferToB64url(response.clientDataJSON),
      authenticatorData: bufferToB64url(response.authenticatorData),
      signature: bufferToB64url(response.signature),
      userHandle: response.userHandle ? bufferToB64url(response.userHandle) : null,
    };
  } catch (error) {
    if (isWebAuthnFocusError(error)) throw new WebAuthnFocusError();
    throw error;
  }
}
