import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { AgentChip, AgentListCard } from '@/components/agent/agent-ui';
import { AgentSearchBar } from '@/components/agent/agent-search';
import { BigButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { AttendanceSheet, AttendanceSheetRow } from '@/lib/agent-types';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type Meta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export default function FeuillePresenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const params = useLocalSearchParams<{ activityId?: string; activityTitle?: string }>();
  const activityId = params.activityId ? Number(params.activityId) : null;
  const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
  const [rows, setRows] = useState<AttendanceSheetRow[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'present' | 'not_recorded'>('present');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (pageNumber = 1, append = false, opts?: { silent?: boolean }) => {
      if (!activityId || !can(PERMISSIONS.attendanceView)) {
        setLoading(false);
        setError(
          !can(PERMISSIONS.attendanceView)
            ? 'Permission attendance.view requise.'
            : 'Activité introuvable.',
        );
        return;
      }

      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get<AttendanceSheet & { meta?: Meta }>(
          `/activities/${activityId}/attendance/sheet`,
          {
            page: pageNumber,
            per_page: 30,
            q: debouncedQ || undefined,
            status:
              filter === 'all' ? undefined : filter === 'present' ? 'present' : 'not_recorded',
            recorded_only: filter === 'present' ? 1 : undefined,
          },
        );
        setSheet(response);
        setMeta(response.meta ?? {});
        setPage(pageNumber);
        const nextRows = response.rows ?? [];
        setRows((current) => (append ? [...current, ...nextRows] : nextRows));
        if (!silent) setError(null);
      } catch (err) {
        if (!append && !silent) {
          setSheet(null);
          setRows([]);
          setError(err instanceof ApiError ? err.message : 'Feuille indisponible.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [activityId, can, filter, debouncedQ],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useBackgroundRefresh(() => load(1, false, { silent: true }), {
    enabled: Boolean(activityId) && can(PERMISSIONS.attendanceView),
    intervalMs: 4000,
  });

  const summary = sheet?.summary;
  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Feuille de présence"
        subtitle={sheet?.activity.title ?? params.activityTitle ?? 'Activité'}
        icon="list-outline"
        showBack
      />

      <View style={styles.pad}>
        {summary ? (
          <View style={styles.kpis}>
            <Kpi label="Attendus" value={summary.expected} />
            <Kpi label="Présents" value={summary.present} tone="success" />
            <Kpi label="Retards" value={summary.late} tone="warning" />
            <Kpi label="Absents" value={summary.absent + summary.not_recorded} tone="danger" />
          </View>
        ) : null}

        <View style={styles.filters}>
          {(['present', 'all', 'not_recorded'] as const).map((key) => (
            <AgentChip
              key={key}
              label={key === 'all' ? 'Tous' : key === 'present' ? 'Présents' : 'Non pointés'}
              active={filter === key}
              onPress={() => setFilter(key)}
            />
          ))}
        </View>

        <AgentSearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher sur la feuille…"
        />

        {can(PERMISSIONS.attendanceRecord) && activityId ? (
          <View style={styles.actions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/scan-qr',
                  params: {
                    mode: 'attendance',
                    activityId: String(activityId),
                    activityTitle: sheet?.activity.title ?? params.activityTitle ?? '',
                  },
                })
              }
            >
              <Ionicons name="qr-code" size={16} color={JP.white} />
              <Text style={styles.actionText}>Scanner un autre</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionAlt]}
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/empreinte',
                  params: {
                    activityId: String(activityId),
                    activityTitle: sheet?.activity.title ?? params.activityTitle ?? '',
                  },
                })
              }
            >
              <Ionicons name="finger-print" size={16} color={JP.white} />
              <Text style={styles.actionText}>Empreinte</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {loading && rows.length === 0 ? (
        <ActivityIndicator color={JP.brand} style={{ marginTop: 24 }} />
      ) : error && rows.length === 0 ? (
        <View style={styles.pad}>
          <EmptyState title="Impossible de charger" subtitle={error} />
          <View style={{ height: 10 }} />
          <BigButton label="Réessayer" onPress={() => void load(1)} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.member_id)}
          refreshing={loading}
          onRefresh={() => void load(1)}
          contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
          ListEmptyComponent={
            <EmptyState title="Aucun membre" subtitle="Aucun membre sur ce filtre." />
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
                  <Text style={styles.moreText}>Charger plus</Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <AgentListCard
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/fiche-membre',
                  params: {
                    memberId: String(item.member_id),
                    memberCode: item.member_code,
                    fullName: item.full_name,
                    photoUrl: item.photo_url ?? '',
                    structure: item.structure ?? '',
                    activityId: activityId ? String(activityId) : '',
                  },
                })
              }
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.meta}>
                    {item.member_code}
                    {item.structure ? ` · ${item.structure}` : ''}
                  </Text>
                  {item.recorded_at ? (
                    <Text style={styles.meta}>
                      {item.method ?? 'pointage'} ·{' '}
                      {new Date(item.recorded_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.recorded_by ? ` · ${item.recorded_by}` : ''}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.status,
                    item.status === 'present' || item.status === 'late'
                      ? styles.statusOk
                      : styles.statusKo,
                  ]}
                >
                  {item.status_label ?? '—'}
                </Text>
              </View>
            </AgentListCard>
          )}
        />
      )}
    </View>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const color =
    tone === 'success'
      ? JP.success
      : tone === 'warning'
        ? JP.warning
        : tone === 'danger'
          ? JP.danger
          : JP.brand;
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  pad: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: {
    flex: 1,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: JP.muted, marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: JP.brand,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionAlt: { backgroundColor: JP.brandDark },
  actionText: { color: JP.white, fontWeight: '800', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '800', color: JP.text, fontSize: 14 },
  meta: { color: JP.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
  status: { fontSize: 11, fontWeight: '800' },
  statusOk: { color: JP.success },
  statusKo: { color: JP.muted },
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
