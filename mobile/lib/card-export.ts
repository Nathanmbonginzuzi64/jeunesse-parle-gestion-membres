import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';

export type CardFace = 'recto' | 'verso';

const FACE_LABEL: Record<CardFace, string> = {
  recto: 'Recto',
  verso: 'Verso',
};

/** Capture PNG haute qualité d’une face de carte. */
export async function captureCardFace(
  ref: RefObject<unknown>,
  face: CardFace,
  memberCode?: string | null,
): Promise<string> {
  if (!ref.current) {
    throw new Error('Carte non prête.');
  }

  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    // Densité élevée pour conserver la netteté au partage / téléchargement
    ...(Platform.OS === 'ios' ? { useRenderInContext: true } : {}),
  });

  const base = FileSystem.cacheDirectory;
  if (!base) return uri;

  const code = (memberCode || 'membre').replace(/[^\w.-]+/g, '_').slice(0, 40);
  const target = `${base}jp-carte-${code}-${face}.png`;
  try {
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  } catch {
    return uri;
  }
}

export async function saveCardImageToGallery(uri: string, face: CardFace): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error('Autorisez l’accès à la galerie pour enregistrer la carte.');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  Alert.alert('Téléchargement', `${FACE_LABEL[face]} enregistré dans votre galerie.`);
}

export async function shareCardImage(uri: string, face: CardFace, memberCode?: string | null): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Partage indisponible sur cet appareil.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: `Carte Jeunesse Parle — ${FACE_LABEL[face]}`,
    UTI: 'public.png',
  });
}

export { FACE_LABEL };
