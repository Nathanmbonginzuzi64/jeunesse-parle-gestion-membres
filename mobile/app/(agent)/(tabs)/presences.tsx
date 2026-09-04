import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState, SectionHeader } from '@/components/membre/section';
import { AgentListCard } from '@/components/agent/agent-ui';
import { AgentSearchBar } from '@/components/agent/agent-search';
import { api, ApiError } from '@/lib/api';
import type {
  AgentOngoingActivity,
  AgentPresentRow,
  AgentPresentsResponse,
} from '@/lib/agent-types';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type ListRow =
  | { type: 'ongoing_header' }
  | { type: 'ongoing'; data: AgentOngoingActivity }
  | { type: 'history_header' }
  | { type: 'date'; date: string }
  | { type: 'present'; data: AgentPresentRow }
  | { type: 'activities_header' }
  | { type: 'activity_link'; id: number; title: string; code?: string; present: number; expected?: number };

function formatDay(date: string) {
  if (date === 'inconnu') return 'Date inconnue';
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function PresencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [ongoing, setOngoing] = useState<AgentOngoingActivity[]>([]);
  const [byDate, setByDate] = useState<Array<{ date: string; items: AgentPresentRow[] }>>([]);
  const [activities, setActivities] = useState<
    Array<{ id: number; title: string; code?: string; attendances_count?: number; participants_count?: number; members_count?: number }>
  >([]);
  const [meta, setMeta] = useState<AgentPresentsResponse['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const [mineOnly, setMineOnly] = useState(true);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canView = can(PERMISSIONS.attendanceView) || can(PERMISSIONS.attendanceRecord);
  const canRecord = can(PERMISSIONS.attendanceRecord);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (pageNumber = 1, append = false, opts?: { silent?: boolean }) => {
      if (!canView) {
        setLoading(false);
        setError('Permission attendance.view ou attendance.record requise.');
        return;
      }

      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const [presents, openActivities] = await Promise.all([
          api.get<AgentPresentsResponse>('/attendance/agent-presents', {
            page: pageNumber,
            per_page: 25,
            mine_only: mineOnly ? 1 : 0,
            q: debouncedQ || undefined,
          }),
          pageNumber === 1
            ? api.get<{
                data: Array<{
                  id: number;
                  title: string;
                  code?: string;
                  attendances_count?: number;
                  participants_count?: number;
                  members_count?: number;
                }>;
              }>('/activities/for-attendance', { per_page: 40 })
            : Promise.resolve(null),
        ]);

        setOngoing(presents.ongoing ?? []);
        setMeta(presents.meta);
        setPage(pageNumber);

        if (append) {
          setByDate((current) => mergeByDate(current, presents.by_date ?? []));
        } else {
          setByDate(presents.by_date ?? []);
          setActivities(openActivities?.data ?? []);
        }
        if (!silent) setError(null);
      } catch (err) {
        if (!append && !silent) {
          setOngoing([]);
          setByDate([]);
          setError(err instanceof ApiError ? err.message : 'Présences indisponibles.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [canView, mineOnly, debouncedQ],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  useBackgroundRefresh(() => load(1, false, { silent: true }), {
    enabled: canView,
    intervalMs: 5000,
  });

  const rows: ListRow[] = [];
  if (ongoing.length > 0) {
    rows.push({ type: 'ongoing_header' });
    ongoing.forEach((item) => rows.push({ type: 'ongoing', data: item }));
  }
  if (byDate.length > 0) {
    rows.push({ type: 'history_header' });
    byDate.forEach((group) => {
      rows.push({ type: 'date', date: group.date });
      group.items.forEach((item) => rows.push({ type: 'present', data: item }));
    });
  }
  if (activities.length > 0) {
    rows.push({ type: 'activities_header' });
    activities.forEach((activity) =>
      rows.push({
        type: 'activity_link',
        id: activity.id,
        title: activity.title,
        code: activity.code,
        present: activity.attendances_count ?? 0,
        expected: activity.participants_count ?? activity.members_count,
      }),
    );
  }

  const hasMore = (meta?.current_page ?? page) < (meta?.last_page ?? 1);

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Présences"
        subtitle="Liste avancée · recherche · détail membre"
        icon="checkmark-done-outline"
      />

      <View style={styles.toolbar}>
        <AgentSearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un présent (nom, code)…"
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mes scans uniquement</Text>
          <Switch
            value={mineOnly}
            onValueChange={setMineOnly}
            trackColor={{ true: JP.brand, false: JP.border }}
          />
        </View>
      </View>

      {!canView ? (
        <View style={styles.pad}>
          <EmptyState
            title="Accès restreint"
            subtitle="Permission attendance.view ou attendance.record requise."
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => {
            if (item.type === 'ongoing') return `ong-${item.data.activity.id}`;
            if (item.type === 'present') return `p-${item.data.id}`;
            if (item.type === 'date') return `d-${item.date}`;
            if (item.type === 'activity_link') return `a-${item.id}`;
            return `${item.type}-${index}`;
          }}
          refreshing={loading}
          onRefresh={() => void load(1)}
          contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title={error ? 'Chargement impossible' : 'Aucune présence scannée'}
                subtitle={
                  error ??
                  'Scannez des cartes sur une activité pour voir les présents ici, regroupés par date.'
                }
              />
            ) : null
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.moreBtn}
                onPress={() => void load(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={JP.brand} />
                ) : (
                  <Text style={styles.moreText}>Charger plus de présents</Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'ongoing_header') {
              return <SectionHeader title="Événement en cours" />;
            }
            if (item.type === 'history_header') {
              return <SectionHeader title="Présents scannés par date" />;
            }
            if (item.type === 'activities_header') {
              return <SectionHeader title="Feuilles d’activité" />;
            }
            if (item.type === 'date') {
              return <Text style={styles.dateLabel}>{formatDay(item.date)}</Text>;
            }
            if (item.type === 'ongoing') {
              const activity = item.data.activity;
              return (
                <AgentListCard
                  active={params.activityId === String(activity.id)}
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
                  <View style={styles.ongoingHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{activity.title}</Text>
                      <Text style={styles.meta}>
                        {activity.status_label ?? activity.status ?? '—'}
                        {activity.location ? ` · ${activity.location}` : ''}
                        {activity.starts_at ? ` · ${formatTime(activity.starts_at)}` : ''}
                      </Text>
                      <Text style={styles.link}>
                        {item.data.present_count} présent(s) scanné(s)
                      </Text>
                    </View>
                    {canRecord ? (
                      <Pressable
                        style={styles.scanBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/(agent)/(tabs)/scan-qr',
                            params: {
                              mode: 'attendance',
                              activityId: String(activity.id),
                              activityTitle: activity.title,
                            },
                          })
                        }
                      >
                        <Ionicons name="qr-code" size={16} color={JP.white} />
                      </Pressable>
                    ) : null}
                  </View>
                  {item.data.presents.slice(0, 5).map((present) => (
                    <View key={present.id} style={styles.presentMini}>
                      <Text style={styles.presentName} numberOfLines={1}>
                        {present.member?.full_name ?? 'Membre'}
                      </Text>
                      <Text style={styles.presentMeta}>
                        {present.member?.member_code ?? '—'} · {formatTime(present.recorded_at)}
                      </Text>
                    </View>
                  ))}
                  {item.data.present_count > 5 ? (
                    <Text style={styles.moreInline}>
                      +{item.data.present_count - 5} autres — ouvrir la feuille
                    </Text>
                  ) : null}
                </AgentListCard>
              );
            }
            if (item.type === 'present') {
              const row = item.data;
              return (
                <AgentListCard
                  onPress={() => {
                    if (row.member?.id) {
                      router.push({
                        pathname: '/(agent)/(tabs)/fiche-membre',
                        params: {
                          memberId: String(row.member.id),
                          memberCode: row.member.member_code,
                          fullName: row.member.full_name,
                          photoUrl: row.member.photo_url ?? '',
                          structure: row.member.structure ?? '',
                          activityId: row.activity?.id ? String(row.activity.id) : '',
                        },
                      });
                      return;
                    }
                    if (row.activity?.id) {
                      router.push({
                        pathname: '/(agent)/(tabs)/feuille',
                        params: {
                          activityId: String(row.activity.id),
                          activityTitle: row.activity.title,
                        },
                      });
                    }
                  }}
                >
                  <Text style={styles.title}>{row.member?.full_name ?? 'Membre'}</Text>
                  <Text style={styles.meta}>
                    {row.member?.member_code ?? '—'}
                    {row.member?.structure ? ` · ${row.member.structure}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {row.activity?.title ?? 'Activité'}
                    {row.method ? ` · ${row.method}` : ''}
                    {` · ${formatTime(row.recorded_at)}`}
                  </Text>
                  <Text style={styles.statusOk}>{row.status_label ?? 'Présent'}</Text>
                  <Text style={styles.link}>Voir le détail membre</Text>
                </AgentListCard>
              );
            }

            return (
              <AgentListCard
                active={params.activityId === String(item.id)}
                onPress={() =>
                  router.push({
                    pathname: '/(agent)/(tabs)/feuille',
                    params: { activityId: String(item.id), activityTitle: item.title },
                  })
                }
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.code ?? '—'} · {item.present} présence(s)
                  {item.expected ? ` / ${item.expected}` : ''}
                </Text>
                <Text style={styles.link}>Ouvrir la feuille complète</Text>
              </AgentListCard>
            );
          }}
        />
      )}
    </View>
  );
}

function mergeByDate(
  current: Array<{ date: string; items: AgentPresentRow[] }>,
  next: Array<{ date: string; items: AgentPresentRow[] }>,
) {
  const map = new Map<string, AgentPresentRow[]>();
  for (const group of current) {
    map.set(group.date, [...group.items]);
  }
  for (const group of next) {
    const existing = map.get(group.date) ?? [];
    const ids = new Set(existing.map((row) => row.id));
    map.set(group.date, [...existing, ...group.items.filter((row) => !ids.has(row.id))]);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  switchRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { fontSize: 13, fontWeight: '700', color: JP.text },
  pad: { padding: 16 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  dateLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'capitalize',
  },
  ongoingHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { fontWeight: '800', color: JP.text, fontSize: 15 },
  meta: { color: JP.muted, fontSize: 12, marginTop: 2, fontWeight: '600' },
  link: { marginTop: 6, color: JP.brand, fontSize: 12, fontWeight: '800' },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentMini: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
  },
  presentName: { fontSize: 13, fontWeight: '700', color: JP.text },
  presentMeta: { fontSize: 11, color: JP.muted, marginTop: 2, fontWeight: '600' },
  moreInline: { marginTop: 8, fontSize: 11, color: JP.brand, fontWeight: '700' },
  statusOk: { marginTop: 6, fontSize: 11, fontWeight: '800', color: JP.success },
  moreBtn: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreText: { color: JP.brand, fontWeight: '800', fontSize: 13 },
});
