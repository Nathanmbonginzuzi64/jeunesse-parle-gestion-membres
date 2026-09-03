import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Badge, BigButton, Card, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

interface ActivityRow {
  id: number;
  code: string;
  title: string;
}

export default function FicheMembreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    memberId: string;
    memberCode: string;
    fullName: string;
    statusLabel?: string;
    province?: string;
    commune?: string;
    structure?: string;
    photoUrl?: string;
    verified?: string;
    cardStatus?: string;
    activityId?: string;
    alreadyPresent?: string;
  }>();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityId, setActivityId] = useState<number | null>(
    params.activityId ? Number(params.activityId) : null,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api
      .get<{ data: ActivityRow[] }>('/activities/for-attendance', { per_page: 20 })
      .then((response) => {
        setActivities(response.data ?? []);
        if (!activityId && response.data?.[0]) setActivityId(response.data[0].id);
      })
      .catch(() => setActivities([]));
  }, []);

  async function confirmPresence() {
    if (!activityId) {
      Alert.alert('Activité requise', 'Sélectionnez une activité pour le pointage.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<{ message?: string; auto_registered?: boolean }>(
        `/activities/${activityId}/attendance`,
        {
          member_id: Number(params.memberId),
          status: 'present',
        },
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Présence confirmée',
        response.message ??
          `${params.fullName} a été pointé(e)${
            response.auto_registered ? ' et inscrit(e) automatiquement' : ''
          }.`,
        [{ text: 'OK', onPress: () => router.replace('/(agent)/(tabs)/verifier') }],
      );
    } catch (error) {
      Alert.alert('Échec', error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title>Fiche membre</Title>
      {params.alreadyPresent === '1' ? (
        <Subtitle>Présence déjà enregistrée pour cette activité.</Subtitle>
      ) : params.verified === '1' ? (
        <Subtitle>Identité confirmée via QR Code.</Subtitle>
      ) : (
        <Subtitle>Vérifiez les informations avant de confirmer la présence.</Subtitle>
      )}

      <Card>
        <View style={styles.hero}>
          {params.photoUrl ? (
            <Image source={{ uri: params.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoInitials}>
                {(params.fullName ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{params.fullName}</Text>
          <Text style={styles.code}>{params.memberCode}</Text>
          <View style={styles.badges}>
            <Badge label={params.statusLabel || 'Membre'} tone="success" />
            {params.cardStatus ? <Badge label={params.cardStatus} tone="success" /> : null}
            {params.verified === '1' ? <Badge label="Identité confirmée" tone="success" /> : null}
            {params.alreadyPresent === '1' ? <Badge label="Présent" tone="success" /> : null}
          </View>
        </View>

        <Text style={styles.meta}>Province : {params.province || '—'}</Text>
        <Text style={styles.meta}>Commune : {params.commune || '—'}</Text>
        <Text style={styles.meta}>Structure : {params.structure || '—'}</Text>
      </Card>

      {params.alreadyPresent !== '1' ? (
        <>
          <Text style={styles.section}>Activité de pointage</Text>
          {activities.map((activity) => (
            <View key={activity.id} style={{ marginBottom: 8 }}>
              <BigButton
                label={activityId === activity.id ? `✓ ${activity.title}` : activity.title}
                tone={activityId === activity.id ? 'success' : 'neutral'}
                onPress={() => setActivityId(activity.id)}
              />
            </View>
          ))}
          {activities.length === 0 ? (
            <Text style={styles.meta}>Aucune activité ouverte pour le pointage.</Text>
          ) : null}

          <View style={{ height: 16 }} />
          <BigButton
            label="Confirmer présence"
            tone="success"
            loading={saving}
            onPress={() => void confirmPresence()}
          />
        </>
      ) : null}
      <View style={{ height: 10 }} />
      <BigButton label="Retour" tone="neutral" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 12 },
  photo: { width: 96, height: 96, borderRadius: 24, marginBottom: 12 },
  photoFallback: {
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: { fontSize: 36, fontWeight: '800', color: JP.brand },
  name: { fontSize: 22, fontWeight: '800', color: JP.text, textAlign: 'center' },
  code: { marginTop: 4, fontFamily: 'monospace', color: JP.muted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' },
  meta: { color: JP.muted, fontSize: 14, marginTop: 4 },
  section: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '700',
    color: JP.muted,
    textTransform: 'uppercase',
  },
});
