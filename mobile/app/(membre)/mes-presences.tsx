import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { BigButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type AttendanceItem = {
  id: number;
  status?: string | null;
  status_label?: string | null;
  method?: string | null;
  recorded_at?: string | null;
  activity?: {
    id: number;
    code?: string;
    title: string;
    location?: string | null;
    starts_at?: string | null;
  } | null;
};

type Summary = {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
};

type Meta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

type ListRow =
  | { type: 'summary' }
  | { type: 'date'; date: string }
  | { type: 'item'; data: AttendanceItem };

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

function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MesPresencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byDate, setByDate] = useState<Array<{ date: string; items: AttendanceItem[] }>>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNumber = 1, opts?: { append?: boolean; silent?: boolean }) => {
      const append = Boolean(opts?.append);
      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get<{
          summary: Summary;
          by_date: Array<{ date: string; items: AttendanceItem[] }>;
          meta?: Meta;
        }>('/attendances/for-member', {
          page: pageNumber,
          per_page: 25,
          status: status === 'all' ? undefined : status,
        });

        setSummary(response.summary);
        setMeta(response.meta ?? {});
        setPage(pageNumber);

        if (append) {
          setByDate((current) => mergeDates(current, response.by_date ?? []));
        } else {
          setByDate(response.by_date ?? []);
        }
        if (!silent) setError(null);
      } catch (err) {
        if (!append && !silent) {
          setByDate([]);
          setSummary(null);
          setError(err instanceof ApiError ? err.message : 'Présences indisponibles.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [status],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  useBackgroundRefresh(() => load(1, { silent: true }), { intervalMs: 15000 });

  const rows: ListRow[] = [{ type: 'summary' }];
  byDate.forEach((group) => {
    rows.push({ type: 'date', date: group.date });
    group.items.forEach((item) => rows.push({ type: 'item', data: item }));
  });

  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Mes présences"
        subtitle="Historique de vos pointages"
        icon="checkmark-done-outline"
        showBack
      />

      <View style={styles.filters}>
        {(
          [
            { key: 'all', label: 'Tous' },
            { key: 'present', label: 'Présents' },
            { key: 'late', label: 'Retards' },
            { key: 'absent', label: 'Absents' },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setStatus(opt.key)}
            style={[styles.chip, status === opt.key && styles.chipOn]}
          >
            <Text style={[styles.chipText, status === opt.key && styles.chipTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, index) => {
          if (item.type === 'item') return `i-${item.data.id}`;
          if (item.type === 'date') return `d-${item.date}`;
          return `s-${index}`;
        }}
        refreshing={loading}
        onRefresh={() => void load(1)}
        contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={error ? 'Chargement impossible' : 'Aucune présence'}
              subtitle={
                error ??
                'Inscrivez-vous à une activité puis pointez votre présence pour voir l’historique ici.'
              }
            />
          ) : null
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              style={styles.moreBtn}
              onPress={() => void load(page + 1, { append: true })}
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
        renderItem={({ item }) => {
          if (item.type === 'summary') {
            return (
              <View style={styles.kpis}>
                <Kpi label="Total" value={summary?.total ?? 0} />
                <Kpi label="Présents" value={summary?.present ?? 0} tone="success" />
                <Kpi label="Retards" value={summary?.late ?? 0} tone="warning" />
                <Kpi label="Absents" value={summary?.absent ?? 0} tone="danger" />
              </View>
            );
          }
          if (item.type === 'date') {
            return <Text style={styles.dateLabel}>{formatDay(item.date)}</Text>;
          }

          const row = item.data;
          const ok = row.status === 'present' || row.status === 'late';
          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                row.activity?.id
                  ? router.push(`/(membre)/activite/${row.activity.id}` as never)
                  : undefined
              }
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{row.activity?.title ?? 'Activité'}</Text>
                <Text style={styles.meta}>
                  {row.activity?.code ?? '—'}
                  {row.activity?.location ? ` · ${row.activity.location}` : ''}
                </Text>
                <Text style={styles.meta}>
                  {formatWhen(row.recorded_at)}
                  {row.method ? ` · ${row.method}` : ''}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.status, { color: ok ? JP.success : JP.danger }]}>
                  {row.status_label ?? row.status ?? '—'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={JP.muted} />
              </View>
            </Pressable>
          );
        }}
      />

      {!loading && byDate.length === 0 && !error ? (
        <View style={styles.footerCta}>
          <BigButton
            label="Voir mes activités"
            onPress={() => router.push('/(membre)/(tabs)/activites' as never)}
          />
        </View>
      ) : null}
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

function mergeDates(
  current: Array<{ date: string; items: AttendanceItem[] }>,
  next: Array<{ date: string; items: AttendanceItem[] }>,
) {
  const map = new Map<string, AttendanceItem[]>();
  for (const group of current) map.set(group.date, [...group.items]);
  for (const group of next) {
    const existing = map.get(group.date) ?? [];
    const ids = new Set(existing.map((row) => row.id));
    map.set(group.date, [...existing, ...group.items.filter((row) => !ids.has(row.id))]);
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: JP.brand, borderColor: JP.brand },
  chipText: { fontSize: 12, fontWeight: '700', color: JP.muted },
  chipTextOn: { color: JP.white },
  list: { paddingHorizontal: 16 },
  kpis: { flexDirection: 'row', gap: 8, marginBottom: 8 },
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
  dateLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'capitalize',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: '800', color: JP.text },
  meta: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
  right: { alignItems: 'flex-end', gap: 6 },
  status: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  moreBtn: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreText: { color: JP.brand, fontWeight: '800', fontSize: 13 },
  footerCta: { padding: 16 },
});
