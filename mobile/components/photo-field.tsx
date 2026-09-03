import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { JP } from '@/constants/theme';

export type PickedPhoto = {
  uri: string;
  name: string;
  type: string;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function fileNameFromUri(uri: string, mime: string): string {
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const last = uri.split('/').pop()?.split('?')[0];
  if (last && /\.(jpe?g|png|webp)$/i.test(last)) return last;
  return `photo-identite.${ext}`;
}

function toPicked(asset: ImagePicker.ImagePickerAsset): PickedPhoto | null {
  const type = (asset.mimeType ?? 'image/jpeg').toLowerCase();
  if (!ACCEPTED.includes(type) && !type.startsWith('image/')) {
    return null;
  }
  const mime = ACCEPTED.includes(type) ? type : 'image/jpeg';
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error('size');
  }
  return {
    uri: asset.uri,
    name: asset.fileName || fileNameFromUri(asset.uri, mime),
    type: mime === 'image/jpg' ? 'image/jpeg' : mime,
  };
}

export function PhotoField({
  value,
  onChange,
  error,
}: {
  value: PickedPhoto | null;
  onChange: (photo: PickedPhoto | null) => void;
  error?: string;
}) {
  async function pick(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        fromCamera
          ? 'Autorisez l’appareil photo pour prendre votre photo d’identité.'
          : 'Autorisez l’accès à la galerie pour choisir votre photo d’identité.',
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });

    if (result.canceled || !result.assets[0]) return;

    try {
      const photo = toPicked(result.assets[0]);
      if (!photo) {
        Alert.alert('Format non accepté', 'Utilisez une image JPEG, PNG ou WebP.');
        return;
      }
      onChange(photo);
    } catch (err) {
      if (err instanceof Error && err.message === 'size') {
        Alert.alert('Fichier trop lourd', 'La photo ne doit pas dépasser 10 Mo.');
        return;
      }
      Alert.alert('Photo', 'Impossible de lire ce fichier.');
    }
  }

  function openChooser() {
    Alert.alert('Photo d’identité', 'Choisissez une source', [
      { text: 'Appareil photo', onPress: () => void pick(true) },
      { text: 'Galerie', onPress: () => void pick(false) },
      ...(value ? [{ text: 'Retirer', style: 'destructive' as const, onPress: () => onChange(null) }] : []),
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Photo d’identité</Text>
      <Pressable onPress={openChooser} style={[styles.card, error ? styles.cardError : null]}>
        {value ? (
          <Image source={{ uri: value.uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={28} color={JP.brand} />
          </View>
        )}
        <View style={styles.meta}>
          <Text style={styles.title}>{value ? 'Modifier la photo' : 'Ajouter une photo'}</Text>
          <Text style={styles.hint}>JPEG, PNG ou WebP · 10 Mo max. Visage bien visible, fond uni de préférence.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={JP.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: JP.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    borderRadius: 16,
    padding: 10,
  },
  cardError: { borderColor: JP.danger },
  preview: { width: 72, height: 96, borderRadius: 10, backgroundColor: JP.bg },
  placeholder: {
    width: 72,
    height: 96,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: JP.text },
  hint: { marginTop: 4, fontSize: 12, color: JP.muted, lineHeight: 17 },
  error: { marginTop: 6, color: JP.danger, fontSize: 12 },
});
