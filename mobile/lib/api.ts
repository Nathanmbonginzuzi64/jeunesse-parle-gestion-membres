import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const API_URL_KEY = 'jp.apiBaseUrl';
const TOKEN_KEY = 'jp.token';
const PROBE_TIMEOUT_MS = 3500;

/** Cache mémoire : SecureStore peut être lent / flaky juste après login. */
let memoryToken: string | null | undefined = undefined;

let resolvedBaseUrl: string | null = null;
let resolveInFlight: Promise<string> | null = null;

function expoLanHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost,
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } }).manifest2
      ?.extra?.expoGo?.debuggerHost,
    Constants.linkingUri,
  ];
  for (const candidate of candidates) {
    const match = String(candidate ?? '').match(/(\d{1,3}(?:\.\d{1,3}){3})/);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function normalizeApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return trimmed;
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

function rewriteForDevice(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace(/:\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, '://10.0.2.2');
  }
  return url;
}

function withApiPort(host: string): string {
  return `http://${host}:8000/api`;
}

/** Liste ordonnée des URL API possibles (réseau changeant). */
export function listApiCandidates(saved?: string | null): string[] {
  const out: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    const normalized = normalizeApiBase(value);
    if (!normalized) return;
    if (!out.includes(normalized)) out.push(normalized);
  };

  push(saved);
  push(process.env.EXPO_PUBLIC_API_URL);

  const lan = expoLanHost();
  if (lan) {
    push(withApiPort(lan));
    // Variantes fréquentes si le port Expo n'est pas celui de Laravel
    push(`http://${lan}:8000/api`);
  }

  const extraUrl = extra?.apiUrl;
  if (extraUrl && !isLoopbackHost(safeHostname(extraUrl))) {
    push(extraUrl);
  }

  if (Platform.OS === 'android') {
    push('http://10.0.2.2:8000/api');
  }

  // Dernier recours (simulateur iOS / machine locale)
  push(rewriteForDevice('http://127.0.0.1:8000/api'));
  push('http://localhost:8000/api');

  // app.json peut contenir 127.0.0.1 — on le réécrit pour le device
  if (extraUrl) {
    push(rewriteForDevice(normalizeApiBase(extraUrl)));
  }

  return out;
}

function safeHostname(url: string): string {
  try {
    return new URL(normalizeApiBase(url)).hostname;
  } catch {
    return '';
  }
}

async function probeHealth(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Client-Portal': 'mobile',
      },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) return false;
    const data = (await response.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function readSavedApiUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(API_URL_KEY);
  } catch {
    return null;
  }
}

async function writeSavedApiUrl(url: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(API_URL_KEY, url);
  } catch {
    /* ignore */
  }
}

/**
 * Choisit une URL API joignable. À rappeler quand le réseau change
 * ou après une erreur réseau.
 */
export async function discoverApiBaseUrl(force = false): Promise<string> {
  if (!force && resolvedBaseUrl) return resolvedBaseUrl;
  if (!force && resolveInFlight) return resolveInFlight;

  resolveInFlight = (async () => {
    const saved = await readSavedApiUrl();
    const candidates = listApiCandidates(saved);

    for (const candidate of candidates) {
      if (await probeHealth(candidate)) {
        resolvedBaseUrl = candidate;
        await writeSavedApiUrl(candidate);
        return candidate;
      }
    }

    // Aucun health OK : conserve la meilleure estimation (LAN Expo prioritaire)
    const fallback = candidates[0] ?? rewriteForDevice('http://127.0.0.1:8000/api');
    resolvedBaseUrl = fallback;
    return fallback;
  })();

  try {
    return await resolveInFlight;
  } finally {
    resolveInFlight = null;
  }
}

/** Force une nouvelle découverte (changement Wi‑Fi / IP). */
export async function reconnectApi(): Promise<string> {
  resolvedBaseUrl = null;
  return discoverApiBaseUrl(true);
}

export function getApiBaseUrlSync(): string {
  if (resolvedBaseUrl) return resolvedBaseUrl;
  const lan = expoLanHost();
  if (lan) return withApiPort(lan);
  const extraUrl = extra?.apiUrl?.replace(/\/$/, '');
  if (extraUrl) return rewriteForDevice(normalizeApiBase(extraUrl));
  return rewriteForDevice('http://127.0.0.1:8000/api');
}

/** Compat : valeur à l’instant T (peut être mis à jour après discover). */
export let API_BASE_URL = getApiBaseUrlSync();

function syncExportedBase(url: string) {
  resolvedBaseUrl = url;
  API_BASE_URL = url;
}

/** Réécrit les URLs médias Laravel (souvent localhost) vers l’hôte API du téléphone. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const base = getApiBaseUrlSync();
    const api = new URL(base);
    const origin = `${api.protocol}//${api.host}`;
    if (url.startsWith('/')) {
      return `${origin}${url}`;
    }
    const media = new URL(url);
    media.protocol = api.protocol;
    media.hostname = api.hostname;
    media.port = api.port;
    return media.toString();
  } catch {
    return url;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]>;
  readonly payload: Record<string, unknown>;

  constructor(status: number, message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.errors = (payload.errors as Record<string, string[]>) ?? {};
  }
}

function messageFromPayload(data: Record<string, unknown>, fallback: string): string {
  const errors = data.errors as Record<string, string[]> | undefined;
  if (errors) {
    for (const messages of Object.values(errors)) {
      if (messages?.[0]) return messages[0];
    }
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return fallback;
}

export async function getToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  try {
    memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
    return memoryToken;
  } catch {
    memoryToken = null;
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  memoryToken = token;
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch {
    /* le cache mémoire reste la source de vérité pour la session courante */
  }
}

export function deviceName(): string {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'mobile';
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildQuery(params?: Query): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    query?: Query;
    anonymous?: boolean;
    retried?: boolean;
  } = {},
): Promise<T> {
  const { method = 'GET', body, query, anonymous = false, retried = false } = options;
  const base = await discoverApiBaseUrl();
  syncExportedBase(base);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client-Portal': 'mobile',
  };

  if (!anonymous) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let payload: string | FormData | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: payload,
    });
  } catch {
    if (!retried) {
      // Réseau / IP changée : rediscovery puis 1 nouvel essai
      resolvedBaseUrl = null;
      await discoverApiBaseUrl(true);
      return request<T>(path, { ...options, retried: true });
    }
    throw new ApiError(
      0,
      'Serveur injoignable. Vérifiez votre connexion Wi‑Fi et que le serveur est démarré.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  let data: Record<string, unknown> = {};
  if (contentType.includes('application/json')) {
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (response.status === 401 && !anonymous) {
    // Ne déconnecte que si un jeton était réellement envoyé (évite les courses au démarrage).
    const hadToken = Boolean(headers.Authorization);
    if (hadToken) {
      await setToken(null);
      onUnauthorized?.();
    }
    throw new ApiError(401, messageFromPayload(data, 'Authentification requise.'), data);
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      messageFromPayload(data, 'Une erreur est survenue.'),
      data,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  public: {
    get: <T>(path: string, query?: Query) => request<T>(path, { query, anonymous: true }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, anonymous: true }),
  },
};

/** Démarre la découverte tôt (splash / auth). */
void discoverApiBaseUrl().then(syncExportedBase).catch(() => undefined);
