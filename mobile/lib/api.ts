import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

function expoLanHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost,
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

function rewriteForDevice(url: string): string {
  if (Platform.OS === 'android') {
    return url.replace(/:\/\/(127\.0\.0\.1|localhost)(?=[:/]|$)/, '://10.0.2.2');
  }
  return url;
}

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return rewriteForDevice(fromEnv);

  const extraUrl = extra?.apiUrl?.replace(/\/$/, '');
  let extraHost = '';
  try {
    extraHost = extraUrl ? new URL(extraUrl).hostname : '';
  } catch {
    extraHost = '';
  }

  const lan = expoLanHost();
  if (lan && (!extraHost || isLoopbackHost(extraHost))) {
    return `http://${lan}:8000/api`;
  }

  if (extraUrl) return rewriteForDevice(extraUrl);
  if (lan) return `http://${lan}:8000/api`;
  return rewriteForDevice('http://127.0.0.1:8000/api');
}

export const API_BASE_URL = resolveApiBaseUrl();

const TOKEN_KEY = 'jp.token';

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

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  } = {},
): Promise<T> {
  const { method = 'GET', body, query, anonymous = false } = options;
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
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: payload,
    });
  } catch {
    throw new ApiError(
      0,
      `Serveur injoignable (${API_BASE_URL}). Sur le PC : php artisan serve --host=0.0.0.0 --port=8000`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? ((await response.json()) as Record<string, unknown>)
    : {};

  if (response.status === 401 && !anonymous) {
    await setToken(null);
    onUnauthorized?.();
    throw new ApiError(401, (data.message as string) ?? 'Session expirée.');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data.message as string) ?? 'Une erreur est survenue.',
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
