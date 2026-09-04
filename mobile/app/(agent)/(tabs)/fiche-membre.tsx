import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { SectionHeader } from '@/components/membre/section';
import { AgentListCard } from '@/components/agent/agent-ui';
import { Badge, BigButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { pushAgentHistory } from '@/lib/agent-history';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

interface ActivityRow {
  id: number;
  code: string;
  title: string;
}

export default function FicheMembreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const loadActivities = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{ data: ActivityRow[] }>('/activities/for-attendance', {
        per_page: 20,
      });
      setActivities(response.data ?? []);
      setActivityId((current) => current ?? response.data?.[0]?.id ?? null);
    } catch {
      if (!silent) setActivities([]);
    }
  }, []);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useBackgroundRefresh(() => loadActivities({ silent: true }), { intervalMs: 8000 });

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
      const msg =
        response.message ??
        `${params.fullName} a été pointé(e)${
          response.auto_registered ? ' et inscrit(e) automatiquement' : ''
        }.`;
      await pushAgentHistory({
        kind: 'attendance',
        ok: true,
        title: params.fullName ?? params.memberCode ?? 'Membre',
        subtitle: msg,
        memberCode: params.memberCode,
        activityTitle: activities.find((item) => item.id === activityId)?.title,
      });
      Alert.alert('Présence confirmée', msg, [
        { text: 'OK', onPress: () => router.replace('/(agent)/(tabs)/verifier') },
        {
          text: 'Feuille',
          onPress: () =>
            router.replace({
              pathname: '/(agent)/(tabs)/feuille',
              params: {
                activityId: String(activityId),
                activityTitle: activities.find((item) => item.id === activityId)?.title ?? '',
              },
            }),
        },
      ]);
    } catch (error) {
      Alert.alert('Échec', error instanceof ApiError ? error.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  const subtitle =
    params.alreadyPresent === '1'
      ? 'Présence déjà enregistrée'
      : params.verified === '1'
        ? 'Identité confirmée via QR'
        : 'Vérifiez avant de pointer';

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Fiche membre"
        subtitle={subtitle}
        icon="person-outline"
        showBack
        showNotifications={false}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
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
              {params.verified === '1' ? <Badge label="Identité OK" tone="success" /> : null}
              {params.alreadyPresent === '1' ? <Badge label="Présent" tone="success" /> : null}
            </View>
          </View>
          <Text style={styles.meta}>Province : {params.province || '—'}</Text>
          <Text style={styles.meta}>Commune : {params.commune || '—'}</Text>
          <Text style={styles.meta}>Structure : {params.structure || '—'}</Text>
        </View>

        {params.alreadyPresent !== '1' ? (
          <>
            <SectionHeader title="Activité de pointage" />
            {activities.map((activity) => (
              <AgentListCard
                key={activity.id}
                active={activityId === activity.id}
                onPress={() => setActivityId(activity.id)}
              >
                <Text style={styles.activityTitle}>
                  {activityId === activity.id ? `✓ ${activity.title}` : activity.title}
                </Text>
                <Text style={styles.meta}>{activity.code}</Text>
              </AgentListCard>
            ))}
            <View style={{ height: 12 }} />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 16,
    marginBottom: 8,
  },
  hero: { alignItems: 'center', marginBottom: 12 },
  photo: { width: 96, height: 96, borderRadius: 24, marginBottom: 12 },
  photoFallback: {
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: { fontSize: 36, fontWeight: '800', color: JP.brand },
  name: { fontSize: 22, fontWeight: '800', color: JP.text, textAlign: 'center' },
  code: { marginTop: 4, fontFamily: 'monospace', color: JP.muted, fontWeight: '700' },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  meta: { color: JP.muted, fontSize: 13, marginTop: 4, fontWeight: '600' },
  activityTitle: { fontWeight: '800', color: JP.text, fontSize: 14 },
});
