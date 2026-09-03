import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import { API_BASE_URL, getToken, resolveMediaUrl } from '@/lib/api';
import { JP } from '@/constants/theme';

async function blobToDataUri(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    chars.push(String.fromCharCode(bytes[i]!));
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  // btoa est disponible sous Expo / Hermes
  const base64 = globalThis.btoa(chars.join(''));
  return `data:${contentType};base64,${base64}`;
}

/** Construit l’URL photo membre côté client (évite localhost Laravel). */
export function memberPhotoUrl(memberCode?: string | null): string | null {
  if (!memberCode) return null;
  return `${API_BASE_URL}/media/members/${encodeURIComponent(memberCode)}/photo`;
}

export function activityImageUrl(activityCode?: string | null): string | null {
  if (!activityCode) return null;
  return `${API_BASE_URL}/media/activities/${encodeURIComponent(activityCode)}/image`;
}

/**
 * Charge une image protégée (Bearer) — Image RN n’envoie pas toujours les headers.
 */
export function AuthenticatedImage({
  uri,
  memberCode,
  activityCode,
  style,
  fallbackLetter,
}: {
  uri?: string | null;
  memberCode?: string | null;
  activityCode?: string | null;
  style?: StyleProp<ImageStyle>;
  fallbackLetter?: string;
}) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setFailed(false);
      setDataUri(null);

      const candidates = [
        resolveMediaUrl(uri),
        activityImageUrl(activityCode),
        memberPhotoUrl(memberCode),
      ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

      if (candidates.length === 0) {
        if (!cancelled) setFailed(true);
        return;
      }

      const token = await getToken();
      const headers: Record<string, string> = {
        Accept: 'image/*,application/octet-stream',
        'X-Client-Portal': 'mobile',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { headers });
          if (!response.ok) continue;
          const data = await blobToDataUri(response);
          if (!cancelled) {
            setDataUri(data);
            setFailed(false);
          }
          return;
        } catch {
          /* essai suivant */
        }
      }

      if (!cancelled) setFailed(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [uri, memberCode, activityCode]);

  if (dataUri) {
    return <Image source={{ uri: dataUri }} style={style} />;
  }

  return (
    <View style={[styles.fallback, style]}>
      <Text style={styles.letter}>{(fallbackLetter || '?').slice(0, 1).toUpperCase()}</Text>
      {!failed ? <Text style={styles.loading}>…</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 28, fontWeight: '800', color: JP.brand },
  loading: { position: 'absolute', bottom: 6, fontSize: 10, color: JP.muted },
});
