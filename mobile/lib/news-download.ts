import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getToken, resolveMediaUrl } from '@/lib/api';

function downloadUrl(mediaUrl: string) {
  const resolved = resolveMediaUrl(mediaUrl);
  if (!resolved) return null;
  const sep = resolved.includes('?') ? '&' : '?';
  return `${resolved}${sep}download=1`;
}

function guessExtension(mediaType?: string | null, url?: string | null) {
  const type = (mediaType ?? '').toLowerCase();
  if (type.includes('pdf') || type.includes('document')) return 'pdf';
  if (type.includes('video')) return 'mp4';
  if (type.includes('image') || type.includes('photo') || type.includes('gallery')) return 'jpg';
  const match = String(url ?? '').match(/\.([a-z0-9]+)(?:\?|$)/i);
  return match?.[1] ?? 'bin';
}

/** Télécharge un média protégé puis ouvre la feuille de partage native. */
export async function downloadNewsMedia(opts: {
  mediaUrl?: string | null;
  mediaType?: string | null;
  title?: string | null;
}) {
  const url = opts.mediaUrl ? downloadUrl(opts.mediaUrl) : null;
  if (!url) {
    Alert.alert('Téléchargement', 'Aucun fichier à télécharger pour cette publication.');
    return;
  }

  const token = await getToken();
  const ext = guessExtension(opts.mediaType, url);
  const safeName = (opts.title || 'actualite')
    .replace(/[^\w\-]+/g, '_')
    .slice(0, 40);
  const base = FileSystem.cacheDirectory;
  if (!base) {
    Alert.alert('Téléchargement', 'Stockage indisponible sur cet appareil.');
    return;
  }
  const target = `${base}jp_${safeName}_${Date.now()}.${ext}`;

  try {
    const result = await FileSystem.downloadAsync(url, target, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Client-Portal': 'mobile',
        Accept: '*/*',
      },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`HTTP ${result.status}`);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, {
        dialogTitle: 'Enregistrer / partager le fichier',
        mimeType:
          ext === 'pdf'
            ? 'application/pdf'
            : ext === 'mp4'
              ? 'video/mp4'
              : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      });
      return;
    }

    await Share.share({
      url: Platform.OS === 'ios' ? result.uri : undefined,
      message: Platform.OS === 'android' ? result.uri : opts.title || 'Fichier Jeunesse Parle',
    });
  } catch {
    Alert.alert(
      'Téléchargement',
      'Impossible de télécharger ce fichier. Vérifiez votre connexion.',
    );
  }
}
