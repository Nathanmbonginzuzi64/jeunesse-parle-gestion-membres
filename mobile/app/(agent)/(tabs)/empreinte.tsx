import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BigButton, Field, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function AgentEmpreinteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string; activityTitle?: string }>();
  const activityId = params.activityId ? Number(params.activityId) : null;
  const [memberCode, setMemberCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      Alert.alert(
        'Activité requise',
        'Choisissez d’abord une activité dans Présences.',
        [{ text: 'OK', onPress: () => router.replace('/(agent)/(tabs)/presences') }],
      );
    }
  }, [activityId, router]);

  const record = useCallback(async () => {
    if (!activityId) return;
    const code = memberCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Code membre', 'Saisissez le code du membre (ex. JP-…).');
      return;
    }

    setBusy(true);
    setLastResult(null);
    try {
      const response = await api.post<{
        valid?: boolean;
        message?: string;
        auto_registered?: boolean;
        full_name?: string | null;
        attendance_recorded?: boolean;
      }>(`/activities/${activityId}/attendance/fingerprint`, {
        member_code: code,
        format: 'simulation',
      });

      if (!response.valid && response.attendance_recorded === false) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Échec', response.message ?? 'Empreinte non reconnue.');
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const msg =
        response.message ??
        `Présence confirmée${response.auto_registered ? ' (inscrit automatiquement)' : ''}.`;
      setLastResult(msg);
      setMemberCode('');
      Alert.alert('Présence confirmée', msg);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Impossible',
        error instanceof ApiError ? error.message : 'Pointage empreinte impossible.',
      );
    } finally {
      setBusy(false);
    }
  }, [activityId, memberCode]);

  return (
    <Screen>
      <Title>Empreinte</Title>
      <Subtitle>
        {params.activityTitle
          ? `Pointage pour « ${params.activityTitle} ».`
          : 'Identification biométrique + présence automatique.'}
      </Subtitle>
      <Text style={styles.note}>
        Si le membre n’est pas encore inscrit à l’activité, l’empreinte reconnue l’inscrit et
        confirme sa présence en une seule étape.
      </Text>

      <View style={{ height: 12 }} />
      <Field
        label="Code membre"
        placeholder="JP-…"
        autoCapitalize="characters"
        value={memberCode}
        onChangeText={setMemberCode}
        onSubmitEditing={() => void record()}
      />

      <BigButton
        label={busy ? 'Vérification…' : 'Lire empreinte & pointer'}
        loading={busy}
        onPress={() => void record()}
      />

      {busy ? <ActivityIndicator color={JP.brand} style={{ marginTop: 16 }} /> : null}
      {lastResult ? <Text style={styles.ok}>{lastResult}</Text> : null}

      <View style={{ height: 16 }} />
      <BigButton label="Retour" tone="neutral" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: 10,
    fontSize: 13,
    color: JP.muted,
    lineHeight: 18,
  },
  ok: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ECFDF3',
    color: '#067647',
    fontWeight: '700',
    fontSize: 13,
  },
});
