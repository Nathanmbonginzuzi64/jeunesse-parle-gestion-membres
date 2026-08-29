import { ApiError } from "./api";

/** Premier message de chaque champ renvoyé par Laravel. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(
    Object.entries(error.errors).map(([key, messages]) => [key, messages[0] ?? ""]),
  );
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

    form.append(key, String(value));
  }

  return form;
}

export function extractTokenFromQr(raw: string): string {
  const trimmed = raw.trim();
  const match = /verifier-membre\/([A-Za-z0-9]{16,64})/i.exec(trimmed);
  if (match?.[1]) return match[1];
  if (/^JP-RDC-/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.replace(/[^A-Za-z0-9]/g, "");
}
