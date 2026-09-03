import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

function extractToken(raw: string): string {
  const trimmed = raw.trim();
  const match =
    trimmed.match(/\/verifier-membre\/([A-Za-z0-9_-]+)/i) ||
    trimmed.match(/\/verify\/([A-Za-z0-9_-]+)/i);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9_-]{16,80}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{16,80}$/.test(last)) return last;
  } catch {
    /* ignore */
  }
  return trimmed;
}

export default function ScanQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string; activityTitle?: string }>();
  const activityId = params.activityId ? Number(params.activityId) : null;
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    if (!activityId) {
      Alert.alert(
        'Activité requise',
        'Choisissez d’abord une activité dans Présences, puis scannez le QR.',
        [{ text: 'OK', onPress: () => router.replace('/(agent)/(tabs)/presences') }],
      );
    }
  }, [activityId, router]);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (!activityId || locked.current || busy) return;
      locked.current = true;
      setBusy(true);
      setLastMessage(null);
      try {
        const token = extractToken(data);

        const verify = await api.post<{
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

        if (!verify.valid || !verify.member) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('QR non reconnu', verify.message ?? 'Identifiant invalide.');
          return;
        }

        const attendance = await api.post<{
          message?: string;
          auto_registered?: boolean;
        }>(`/activities/${activityId}/attendance`, {
          qr_token: token,
          status: 'present',
        });

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const msg =
          attendance.message ??
          `Présence confirmée : ${verify.member.full_name}${
            attendance.auto_registered ? ' (inscrit automatiquement)' : ''
          }.`;
        setLastMessage(msg);
        Alert.alert('Présence confirmée', msg, [
          { text: 'Scanner encore', style: 'default' },
          {
            text: 'Voir la fiche',
            onPress: () =>
              router.replace({
                pathname: '/(agent)/(tabs)/fiche-membre',
                params: {
                  memberId: String(verify.member!.member_id),
                  memberCode: verify.member!.member_code,
                  fullName: verify.member!.full_name,
                  statusLabel: verify.member!.status ?? '',
                  province: verify.member!.province ?? '',
                  commune: verify.member!.city ?? '',
                  structure: verify.member!.structure ?? '',
                  photoUrl: verify.member!.photo_url ?? '',
                  verified: '1',
                  cardStatus: verify.member!.card_status ?? '',
                  activityId: String(activityId),
                  alreadyPresent: '1',
                },
              }),
          },
        ]);
      } catch (error) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Erreur', error instanceof ApiError ? error.message : 'Lecture impossible.');
      } finally {
        setBusy(false);
        setTimeout(() => {
          locked.current = false;
        }, 1800);
      }
    },
    [activityId, busy, router],
  );

  if (!permission) {
    return (
      <Screen keyboard={false}>
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
        onBarcodeScanned={busy || !activityId ? undefined : onBarcode}
      />
      <View style={styles.overlay}>
        <View>
          <Text style={styles.hint}>
            {busy
              ? 'IDENTIFICATION + POINTAGE…'
              : params.activityTitle
                ? `Scan pour : ${params.activityTitle}`
                : 'Cadrez le QR de la carte'}
          </Text>
          {lastMessage ? <Text style={styles.lastOk}>{lastMessage}</Text> : null}
        </View>
        <View style={styles.frame} />
        <BigButton label="Fermer" tone="neutral" onPress={() => router.back()} />
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
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  lastOk: {
    marginTop: 8,
    color: '#BBF7D0',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 10,
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
