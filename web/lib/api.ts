/**
 * Client HTTP unique vers l'API.
 *
 * En mode design (`NEXT_PUBLIC_USE_MOCKS` différent de `false`), aucune requête
 * n'est envoyée à Laravel : un jeu de données local alimente l'interface.
 */

import { USE_MOCKS } from "./config";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "");

const TOKEN_KEY = "jp.token";

export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;
  readonly payload: Record<string, unknown>;

  constructor(status: number, message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.errors = (payload.errors as Record<string, string[]>) ?? {};
  }

  /** Premier message d'erreur de validation pour un champ donné. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0];
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params?: Query): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  /** Désactive la purge automatique du jeton (utile sur les routes publiques). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, anonymous = false, signal } = options;

  if (USE_MOCKS) {
    const { mockRequest } = await import("./mocks/router");
    return mockRequest<T>({ method, path, query, body, anonymous });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  const token = anonymous ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: payload,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw new ApiError(0, "Serveur injoignable. Vérifiez votre connexion réseau.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !anonymous) {
      setToken(null);
      onUnauthorized?.();
    }

    const parsed = (typeof data === "object" && data !== null ? data : {}) as Record<
      string,
      unknown
    >;

    throw new ApiError(
      response.status,
      (parsed.message as string) || "Une erreur est survenue. Veuillez réessayer.",
      parsed,
    );
  }

  return data as T;
}

/** Envoi multipart avec suivi de progression (XHR). */
export function uploadFormData<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  if (USE_MOCKS) {
    return new Promise((resolve, reject) => {
      let p = 0;
      const tick = setInterval(() => {
        p += 12 + Math.random() * 15;
        onProgress?.(Math.min(95, p));
        if (p >= 95) {
          clearInterval(tick);
          onProgress?.(100);
          import("./mocks/router")
            .then(({ mockRequest }) =>
              mockRequest<T>({ method: "POST", path, body: form }).then(resolve).catch(reject),
            )
            .catch(reject);
        }
      }, 120);
    });
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getToken();
    const url = `${API_BASE_URL}${path}`;

    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 90));
      }
    };

    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data as T);
        return;
      }

      if (xhr.status === 401) {
        setToken(null);
        onUnauthorized?.();
      }

      const parsed = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
      reject(
        new ApiError(
          xhr.status,
          (parsed.message as string) || "Une erreur est survenue. Veuillez réessayer.",
          parsed,
        ),
      );
    };

    xhr.onerror = () => reject(new ApiError(0, "Serveur injoignable. Vérifiez votre connexion réseau."));
    xhr.send(form);
  });
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) =>
    request<T>(path, { method: "POST", body, query }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  uploadFormData,
  public: {
    get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
      request<T>(path, { query, anonymous: true, signal }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: "POST", body, anonymous: true }),
  },
};

/**
 * Télécharge un fichier protégé (export CSV) en réutilisant le jeton courant.
 * L'URL n'est jamais exposée sans en-tête d'autorisation.
 */
export async function downloadFile(path: string, query?: Query, fallbackName = "export.csv") {
  if (USE_MOCKS) {
    const csv =
      "\uFEFFID membre;Nom;Postnom;Prénom;Statut;Province\nJP-RDC-00000001;Mbongi;Kabeya;Nathan;Actif;Kinshasa\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    headers: {
      Accept: "text/csv",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Le téléchargement a échoué.");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackName;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Construit une URL d'image protégée. La balise <img> ne pouvant pas porter
 * d'en-tête, on récupère le binaire puis on expose un object URL.
 */
export async function fetchProtectedImage(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || USE_MOCKS) {
    return url;
  }

  const token = getToken();
  const headers: Record<string, string> = { Accept: "image/*,application/octet-stream" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, { headers, cache: "no-store" });

    if (!response.ok) {
      return url.startsWith("/") ? url : null;
    }

    const blob = await response.blob();
    if (!blob.type.startsWith("image/") && blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch {
    return url.startsWith("/") ? url : null;
  }
}

/** Télécharge un média protégé (image, vidéo, PDF) via le jeton courant. */
export async function downloadProtectedUrl(url: string, fallbackName: string): Promise<void> {
  if (!url) throw new ApiError(0, "Fichier introuvable.");

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  if (USE_MOCKS || url.startsWith("/")) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fallbackName;
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return;
  }

  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Le téléchargement a échoué.");
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = match?.[1] ?? fallbackName;
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
