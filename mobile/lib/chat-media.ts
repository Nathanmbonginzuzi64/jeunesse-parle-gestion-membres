import * as FileSystem from 'expo-file-system/legacy';
import { getToken, resolveMediaUrl } from '@/lib/api';

export type ChatAttachment = {
  id: number;
  kind: 'image' | 'file' | 'audio' | string;
  name: string;
  mime?: string | null;
  size?: number | null;
  url: string;
};

export type ChatMessage = {
  id: number;
  body?: string | null;
  author?: string | null;
  author_id?: number | null;
  photo_url?: string | null;
  created_at?: string | null;
  attachments?: ChatAttachment[];
};

export type PendingFile = {
  uri: string;
  name: string;
  mime: string;
  kind: 'image' | 'file' | 'audio';
};

/** Fichier RN pour FormData multipart. */
export function toFormFile(file: PendingFile) {
  return {
    uri: file.uri,
    name: file.name,
    type: file.mime || 'application/octet-stream',
  } as unknown as Blob;
}

export async function cacheProtectedUri(
  url: string | null | undefined,
  filename: string,
): Promise<string | null> {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return null;
  const base = FileSystem.cacheDirectory;
  if (!base) return resolved;

  const safe = filename.replace(/[^\w.\-]+/g, '_').slice(0, 60) || `chat_${Date.now()}`;
  const target = `${base}jp_chat_${safe}`;
  const token = await getToken();

  try {
    const result = await FileSystem.downloadAsync(resolved, target, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Client-Portal': 'mobile',
        Accept: '*/*',
      },
    });
    if (result.status < 200 || result.status >= 300) return null;
    return result.uri;
  } catch {
    return null;
  }
}

export function formatMessageTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLabel(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function dayKey(value?: string | null) {
  if (!value) return 'unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
