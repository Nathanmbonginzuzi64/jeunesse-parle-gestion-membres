import { ApiError } from "./api";

/** Premier message de chaque champ renvoyé par Laravel. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([key, messages]) => [key, messages[0] ?? ""]),
  );
}

/** Liste lisible des erreurs de validation API. */
export function validationErrorMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return [];
  return Object.values(error.errors)
    .flat()
    .filter(Boolean);
}

export function toFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined || value === "") continue;

    if (value instanceof File) {
      form.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === "object" && !(value[0] instanceof File)) {
        form.append(key, JSON.stringify(value));
        continue;
      }
      value.forEach((item, index) => {
        if (item === null || item === undefined || item === "") return;
        form.append(`${key}[${index}]`, String(item));
      });
      continue;
    }

    if (typeof value === "boolean") {
      form.append(key, value ? "1" : "0");
      continue;
    }

    if (typeof value === "object" && value !== null && !(value instanceof File)) {
      form.append(key, JSON.stringify(value));
      continue;
    }

    form.append(key, String(value));
  }

  return form;
}

export function extractTokenFromQr(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const match =
    trimmed.match(/\/verifier-membre\/([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/\/verify\/([A-Za-z0-9_-]+)/i) ||
    /verifier-membre\/([A-Za-z0-9_-]{8,80})/i.exec(trimmed);
  if (match?.[1]) return match[1];

  if (/^JP-RDC-/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^[A-Za-z0-9_-]{16,80}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && (/^JP-RDC-/i.test(last) || /^[A-Za-z0-9_-]{16,80}$/.test(last))) {
      return /^JP-RDC-/i.test(last) ? last.toUpperCase() : last;
    }
  } catch {
    /* ignore */
  }

  // Ne pas retirer les tirets des codes membre partiels : laisser l'API répondre clairement.
  return trimmed;
}
