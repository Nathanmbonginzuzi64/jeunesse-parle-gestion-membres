import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState, SectionHeader } from '@/components/membre/section';
import { AgentActionTile, AgentListCard } from '@/components/agent/agent-ui';
import { AgentMiniChart } from '@/components/agent/mini-chart';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { PERMISSIONS } from '@/lib/permissions';
import { JP } from '@/constants/theme';

interface ActivityRow {
  id: number;
  code: string;
  title: string;
  status: string;
  starts_at: string | null;
  attendances_count?: number;
  participants_count?: number;
}

type AgentDashboard = {
  kpis: {
    verifications_today: number;
    valid_today: number;
    rejected_today: number;
    presents_today: number;
    verifications_week: number;
    presents_week: number;
    members_verified: number;
  };
  chart: {
    labels: string[];
    verifications: number[];
    valid: number[];
    presents: number[];
  };
  agent: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    role: string | null;
    member_code: string | null;
    member_id: number | null;
  };
};

function greetingForLocalTime(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return { label: 'Bonjour', icon: 'sunny' as const };
  if (hour >= 12 && hour < 18) return { label: 'Bon après-midi', icon: 'partly-sunny' as const };
  if (hour >= 18 && hour < 22) return { label: 'Bonsoir', icon: 'cloudy-night' as const };
  return { label: 'Bonne nuit', icon: 'moon' as const };
}

export default function AgentHomeScreen() {
  const { user, can } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState<ActivityRow[]>([]);
  const [dashboard, setDashboard] = useState<AgentDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting] = useState(() => greetingForLocalTime());

  const canVerify = can(PERMISSIONS.cardsVerify);
  const canRecord = can(PERMISSIONS.attendanceRecord);
  const canViewAttendance = can(PERMISSIONS.attendanceView) || canRecord;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);

    try {
      const dash = await api.get<AgentDashboard>('/agent/dashboard');
      setDashboard(dash);
    } catch {
      if (!silent) setDashboard(null);
    }

    if (!canViewAttendance) {
      if (!silent) setToday([]);
      return;
    }
    try {
      const response = await api.get<{ data: ActivityRow[] }>('/activities/for-attendance', {
        per_page: 8,
      });
      setToday(response.data ?? []);
    } catch {
      if (!silent) setToday([]);
    }
  }, [canViewAttendance]);

  useEffect(() => {
    void load();
  }, [load]);

  useBackgroundRefresh(() => load({ silent: true }), { intervalMs: 5000 });

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const firstName = (user?.name ?? 'Agent').split(' ')[0];
  const photo =
    resolveMediaUrl(dashboard?.agent.photo_url ?? user?.photo_url) ?? null;
  const kpis = dashboard?.kpis;

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title={`${greeting.label}, ${firstName}`}
        subtitle={user?.role?.name ?? 'Agent de vérification'}
        icon={greeting.icon}
      />

      {/* Carte profil fixe : le scroll passe en dessous */}
      <View style={styles.stickyProfile}>
        <View style={styles.profileCard}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Ionicons name="person" size={42} color={JP.muted} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={2}>
              {user?.name ?? 'Agent'}
            </Text>
            <Text style={styles.profileMeta} numberOfLines={1}>
              {user?.role?.name ?? 'Agent de vérification'}
            </Text>
            <Text style={styles.profileId} numberOfLines={1}>
              {dashboard?.agent.member_code ??
                user?.member_code ??
                user?.email ??
                user?.phone ??
                '—'}
            </Text>
            <Text style={styles.profileContact} numberOfLines={2}>
              {[user?.email, user?.phone].filter(Boolean).join('\n') || 'Identifiants compte'}
            </Text>
          </View>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push('/(agent)/securite')}
            accessibilityLabel="Paramètres"
          >
            <Ionicons name="settings-outline" size={18} color={JP.brand} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={[styles.feedContent, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={JP.brand} />
        }
      >
        {kpis ? (
          <>
            <SectionHeader title="Statistiques du jour" />
            <View style={styles.kpiGrid}>
              <StatCard label="Vérifs" value={kpis.verifications_today} tone="brand" />
              <StatCard label="Valides" value={kpis.valid_today} tone="success" />
              <StatCard label="Rejetés" value={kpis.rejected_today} tone="danger" />
              <StatCard label="Présents" value={kpis.presents_today} tone="info" />
            </View>
            <View style={styles.kpiGrid}>
              <StatCard label="Vérifs 7j" value={kpis.verifications_week} tone="brand" wide />
              <StatCard label="Membres OK" value={kpis.members_verified} tone="success" wide />
            </View>
            {dashboard?.chart ? (
              <View style={{ gap: 10, marginBottom: 8 }}>
                <AgentMiniChart
                  title="Vérifications (7 jours)"
                  labels={dashboard.chart.labels}
                  series={dashboard.chart.verifications}
                  color={JP.brand}
                />
                <AgentMiniChart
                  title="Présences enregistrées (7 jours)"
                  labels={dashboard.chart.labels}
                  series={dashboard.chart.presents}
                  color={JP.success}
                />
              </View>
            ) : null}
          </>
        ) : null}

        <SectionHeader title="Actions rapides" />
        <View style={styles.tiles}>
          {canVerify ? (
            <AgentActionTile
              icon="shield-checkmark-outline"
              title="Vérifier"
              subtitle="Identité carte"
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/verifier',
                  params: { mode: 'identity' },
                })
              }
            />
          ) : null}
          {canVerify ? (
            <AgentActionTile
              icon="people-outline"
              title="Membres OK"
              subtitle="Déjà vérifiés"
              tone="success"
              onPress={() => router.push('/(agent)/(tabs)/membres-verifies')}
            />
          ) : null}
        </View>
        {canRecord || canVerify ? (
          <View style={[styles.tiles, { marginTop: 10 }]}>
            {canRecord ? (
              <AgentActionTile
                icon="checkmark-done-outline"
                title="Présences"
                subtitle="Liste avancée"
                tone="dark"
                onPress={() => router.push('/(agent)/(tabs)/presences')}
              />
            ) : null}
            {canVerify ? (
              <AgentActionTile
                icon="time-outline"
                title="Historique"
                subtitle="Avec recherche"
                onPress={() => router.push('/(agent)/(tabs)/historique')}
              />
            ) : null}
          </View>
        ) : null}

        {canViewAttendance ? (
          <>
            <SectionHeader
              title="Activités ouvertes"
              actionLabel="Tout voir"
              onAction={() => router.push('/(agent)/(tabs)/presences')}
            />
            {today.length === 0 ? (
              <EmptyState
                title="Aucune activité ouverte"
                subtitle="Les activités planifiées ou en cours de votre périmètre apparaîtront ici."
              />
            ) : (
              today.map((activity) => (
                <AgentListCard
                  key={activity.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(agent)/(tabs)/feuille',
                      params: {
                        activityId: String(activity.id),
                        activityTitle: activity.title,
                      },
                    })
                  }
                >
                  <View style={styles.activityRow}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="calendar-outline" size={18} color={JP.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.activityTitle} numberOfLines={2}>
                        {activity.title}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {activity.code}
                        {activity.attendances_count != null
                          ? ` · ${activity.attendances_count} présence(s)`
                          : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={JP.muted} />
                  </View>
                </AgentListCard>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  tone,
  wide,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'success' | 'danger' | 'info';
  wide?: boolean;
}) {
  const color =
    tone === 'success'
      ? JP.success
      : tone === 'danger'
        ? JP.danger
        : tone === 'info'
          ? '#0EA5E9'
          : JP.brand;
  return (
    <View style={[styles.statCard, wide && styles.statWide]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  stickyProfile: {
    zIndex: 20,
    elevation: 8,
    backgroundColor: JP.bg,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: JP.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  profileCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: JP.brandLight,
  },
  photoFallback: {
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { fontSize: 18, fontWeight: '900', color: JP.text },
  profileMeta: { marginTop: 2, fontSize: 13, fontWeight: '700', color: JP.brand },
  profileId: { marginTop: 6, fontSize: 12, fontWeight: '800', color: JP.text },
  profileContact: { marginTop: 2, fontSize: 11, fontWeight: '600', color: JP.muted, lineHeight: 15 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statWide: { width: '48%' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { marginTop: 2, fontSize: 11, fontWeight: '700', color: JP.muted },
  tiles: { flexDirection: 'row', gap: 10 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { fontSize: 15, fontWeight: '800', color: JP.text },
  activityMeta: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
});
