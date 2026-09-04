import { useCallback, useEffect, useState } from 'react';
import {
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
import { MemberCardPreview, type CardPreviewData } from '@/components/membre/card-preview';
import { AgentActionTile, AgentListCard } from '@/components/agent/agent-ui';
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
  const [refreshing, setRefreshing] = useState(false);
  const [greeting] = useState(() => greetingForLocalTime());
  const [card, setCard] = useState<CardPreviewData | null>(null);

  const canVerify = can(PERMISSIONS.cardsVerify);
  const canRecord = can(PERMISSIONS.attendanceRecord);
  const canViewAttendance = can(PERMISSIONS.attendanceView) || canRecord;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);

    if (user?.member_id && user.can_view_card) {
      try {
        const response = await api.get<{
          data?: { card_number?: string; status_label?: string } | null;
          render?: CardPreviewData | null;
        }>(`/members/${user.member_id}/card`);
        if (response.render) {
          setCard({
            ...response.render,
            photo_url: resolveMediaUrl(response.render.photo_url),
          });
        } else if (!silent) {
          setCard(null);
        }
      } catch {
        if (!silent) setCard(null);
      }
    } else if (!silent) {
      setCard(null);
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
  }, [canViewAttendance, user?.member_id, user?.can_view_card]);

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

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title={`${greeting.label}, ${firstName}`}
        subtitle={user?.role?.name ?? 'Agent de vérification'}
        icon={greeting.icon}
      >
        {card ? (
          <View style={styles.cardWrap}>
            <MemberCardPreview
              card={card}
              onPress={() => router.push('/(agent)/ma-carte')}
            />
          </View>
        ) : null}
      </MembrePageHeader>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={[styles.feedContent, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={JP.brand} />
        }
      >
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
              icon="qr-code-outline"
              title="Scanner QR"
              subtitle="Sans pointage"
              tone="success"
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/scan-qr',
                  params: { mode: 'verify' },
                })
              }
            />
          ) : null}
        </View>
        {canRecord ? (
          <View style={[styles.tiles, { marginTop: 10 }]}>
            <AgentActionTile
              icon="checkmark-done-outline"
              title="Pointage"
              subtitle="Activité terrain"
              tone="dark"
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/verifier',
                  params: { mode: 'attendance' },
                })
              }
            />
            <AgentActionTile
              icon="list-outline"
              title="Présences"
              subtitle="Feuilles live"
              onPress={() => router.push('/(agent)/(tabs)/presences')}
            />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  feed: { flex: 1 },
  feedContent: { paddingHorizontal: 16, paddingTop: 4 },
  cardWrap: { marginTop: 8, marginBottom: 4 },
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
