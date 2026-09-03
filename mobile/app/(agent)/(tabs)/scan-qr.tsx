import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/verify\/([A-Za-z0-9]+)/i);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9]{16,64}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export default function ScanQrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (locked.current || busy) return;
      locked.current = true;
      setBusy(true);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const token = extractToken(data);
        const result = await api.post<{
          valid: boolean;
          message?: string;
          member?: {
            member_id: number;
            member_code: string;
            full_name: string;
            status?: string;
            photo_url?: string | null;
            province?: string | null;
            city?: string | null;
            structure?: string | null;
            card_status?: string | null;
          };
        }>('/members/verify', { token });

        if (!result.valid || !result.member) {
          Alert.alert('QR non reconnu', result.message ?? 'Identifiant invalide.');
          return;
        }

        router.replace({
          pathname: '/(agent)/(tabs)/fiche-membre',
          params: {
            memberId: String(result.member.member_id),
            memberCode: result.member.member_code,
            fullName: result.member.full_name,
            statusLabel: result.member.status ?? '',
            province: result.member.province ?? '',
            commune: result.member.city ?? '',
            structure: result.member.structure ?? '',
            photoUrl: result.member.photo_url ?? '',
            verified: '1',
            cardStatus: result.member.card_status ?? '',
          },
        });
      } catch (error) {
        Alert.alert('Erreur', error instanceof ApiError ? error.message : 'Lecture impossible.');
      } finally {
        setBusy(false);
        setTimeout(() => {
          locked.current = false;
        }, 1500);
      }
    },
    [busy, router],
  );

  if (!permission) {
    return (
      <Screen>
        <Title>Caméra</Title>
        <Subtitle>Chargement des permissions…</Subtitle>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Title>Accès caméra requis</Title>
        <Subtitle>Autorisez la caméra pour scanner les QR codes des cartes membres.</Subtitle>
        <View style={{ height: 16 }} />
        <BigButton label="Autoriser la caméra" onPress={() => void requestPermission()} />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : onBarcode}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>{busy ? 'IDENTIFICATION EN COURS…' : 'Cadrez le QR de la carte'}</Text>
        <View style={styles.frame} />
        <BigButton label="Annuler" tone="neutral" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  hint: {
    color: JP.white,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  frame: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: JP.white,
    borderRadius: 24,
  },
});
