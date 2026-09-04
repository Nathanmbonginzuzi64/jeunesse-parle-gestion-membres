import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { VerificationResultCard } from '@/components/agent/verification-result-card';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { pushAgentHistory } from '@/lib/agent-history';
import type { VerificationResult } from '@/lib/agent-types';
import { extractTokenFromQr } from '@/lib/qr-token';
import { JP } from '@/constants/theme';

export default function ScanQrScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    activityId?: string;
    activityTitle?: string;
    mode?: string;
  }>();
  const mode = params.mode === 'verify' ? 'verify' : 'attendance';
  const activityId = params.activityId ? Number(params.activityId) : null;
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const locked = useRef(false);

  useEffect(() => {
    if (mode === 'attendance' && !activityId) {
      Alert.alert(
        'Activité requise',
        'Choisissez d’abord une activité dans Présences, puis scannez le QR.',
        [{ text: 'OK', onPress: () => router.replace('/(agent)/(tabs)/presences') }],
      );
    }
  }, [activityId, mode, router]);

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (locked.current || busy) return;
      if (mode === 'attendance' && !activityId) return;

      locked.current = true;
      setBusy(true);
      setLastMessage(null);
      setVerifyResult(null);

      try {
        const token = extractTokenFromQr(data);

        if (mode === 'verify') {
          try {
            const response = await api.post<VerificationResult>('/members/verify', {
              token,
            });
            setVerifyResult(response);
            await Haptics.notificationAsync(
              response.valid
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning,
            );
            await pushAgentHistory({
              kind: 'verify',
              ok: Boolean(response.valid),
              title: response.member?.full_name ?? response.message,
              subtitle: response.member?.member_code ?? response.result,
              memberCode: response.member?.member_code,
            });
            setLastMessage(response.message);
          } catch (caught) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (caught instanceof ApiError) {
              const payload = caught.payload as unknown as VerificationResult;
              setVerifyResult(payload?.result ? payload : null);
              setLastMessage(caught.message);
            } else {
              Alert.alert('Erreur', 'Vérification impossible.');
            }
          }
          return;
        }

        const verify = await api.post<VerificationResult>('/members/verify', { token });

        if (!verify.valid || !verify.member) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setVerifyResult(verify);
          Alert.alert('QR non reconnu', verify.message ?? 'Identifiant invalide.');
          await pushAgentHistory({
            kind: 'verify',
            ok: false,
            title: verify.message,
            subtitle: verify.result,
          });
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
        setVerifyResult(verify);
        await pushAgentHistory({
          kind: 'attendance',
          ok: true,
          title: verify.member.full_name,
          subtitle: msg,
          memberCode: verify.member.member_code,
          activityTitle: params.activityTitle,
        });

        Alert.alert('Présence confirmée', msg, [
          { text: 'Scanner encore', style: 'default' },
          {
            text: 'Feuille',
            onPress: () =>
              router.replace({
                pathname: '/(agent)/(tabs)/feuille',
                params: {
                  activityId: String(activityId),
                  activityTitle: params.activityTitle ?? '',
                },
              }),
          },
          {
            text: 'Voir la fiche',
            onPress: () =>
              router.replace({
                pathname: '/(agent)/(tabs)/fiche-membre',
                params: {
                  memberId: String(verify.member!.member_id ?? ''),
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
    [activityId, busy, mode, params.activityTitle, router],
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

  const canScan = mode === 'verify' || Boolean(activityId);

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy || !canScan ? undefined : onBarcode}
      />
      <View style={styles.overlay}>
        <View>
          <Text style={styles.hint}>
            {busy
              ? mode === 'verify'
                ? 'VÉRIFICATION IDENTITÉ…'
                : 'IDENTIFICATION + POINTAGE…'
              : mode === 'verify'
                ? 'Scan identité (sans pointage)'
                : params.activityTitle
                  ? `Scan pour : ${params.activityTitle}`
                  : 'Cadrez le QR de la carte'}
          </Text>
          {lastMessage ? <Text style={styles.lastOk}>{lastMessage}</Text> : null}
        </View>
        <View style={styles.frame} />
        {mode === 'verify' && verifyResult ? (
          <View style={styles.resultWrap}>
            <VerificationResultCard result={verifyResult} />
          </View>
        ) : null}
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
  resultWrap: {
    maxHeight: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
