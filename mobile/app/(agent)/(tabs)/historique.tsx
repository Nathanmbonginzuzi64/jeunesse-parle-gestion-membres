import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { AgentChip, AgentListCard } from '@/components/agent/agent-ui';
import { AgentSearchBar } from '@/components/agent/agent-search';
import { BigButton } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { VerificationHistoryItem } from '@/lib/agent-types';
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

const PAGE_SIZE = 20;

export default function HistoriqueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const [items, setItems] = useState<VerificationHistoryItem[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [page, setPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<'all' | 'valid' | 'rejected'>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVerify = can(PERMISSIONS.cardsVerify);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const loadPage = useCallback(
    async (pageNumber: number, opts?: { append?: boolean; silent?: boolean }) => {
      if (!canVerify) {
        setItems([]);
        setLoading(false);
        setError('Permission cards.verify requise.');
        return;
      }

      const append = Boolean(opts?.append);
      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get<{ data: VerificationHistoryItem[]; meta?: Meta }>(
          '/verifications/history',
          {
            page: pageNumber,
            per_page: PAGE_SIZE,
            q: debouncedQ || undefined,
            result:
              resultFilter === 'all'
                ? undefined
                : resultFilter === 'valid'
                  ? 'valid'
                  : 'rejected',
          },
        );

        const rows = response.data ?? [];

        setMeta(response.meta ?? {});
        setPage(pageNumber);
        setItems((current) => (append ? [...current, ...rows] : rows));
        if (!silent) setError(null);
      } catch (err) {
        if (!append && !silent) {
          setItems([]);
          setError(err instanceof ApiError ? err.message : 'Historique indisponible.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [canVerify, resultFilter, debouncedQ],
  );

  useFocusEffect(
    useCallback(() => {
      void loadPage(1);
    }, [loadPage]),
  );

  useBackgroundRefresh(() => loadPage(1, { silent: true }), {
    enabled: canVerify,
    intervalMs: 8000,
  });

  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);
  const total = meta.total ?? items.length;

  function startNewVerification() {
    router.push({
      pathname: '/(agent)/(tabs)/verifier',
      params: { mode: 'identity', fresh: '1' },
    });
  }

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Historique"
        subtitle={
          loading
            ? 'Chargement…'
            : `${total} vérification${total > 1 ? 's' : ''}`
        }
        icon="time-outline"
      />

      <View style={styles.toolbar}>
        <BigButton
          label="Nouvelle vérification"
          onPress={startNewVerification}
          disabled={!canVerify}
        />
        <AgentSearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher un membre vérifié…"
        />
        <Pressable
          style={styles.linkRow}
          onPress={() => router.push('/(agent)/(tabs)/membres-verifies')}
        >
          <Ionicons name="people-outline" size={16} color={JP.brand} />
          <Text style={styles.linkText}>Voir la liste des membres vérifiés</Text>
          <Ionicons name="chevron-forward" size={16} color={JP.brand} />
        </Pressable>
        <View style={styles.filters}>
          {(
            [
              { key: 'all', label: 'Tous' },
              { key: 'valid', label: 'Valides' },
              { key: 'rejected', label: 'Rejetés' },
            ] as const
          ).map((opt) => (
            <AgentChip
              key={opt.key}
              label={opt.label}
              active={resultFilter === opt.key}
              onPress={() => setResultFilter(opt.key)}
            />
          ))}
        </View>
      </View>

      {!canVerify ? (
        <View style={styles.pad}>
          <EmptyState
            title="Accès restreint"
            subtitle="Permission cards.verify requise pour consulter l’historique."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshing={loading}
          onRefresh={() => void loadPage(1)}
          contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title={error ? 'Chargement impossible' : 'Aucune vérification'}
                subtitle={
                  error ??
                  'Scannez une carte pour alimenter cet historique. Vous pourrez ensuite lancer une nouvelle vérification.'
                }
              />
            ) : null
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.moreBtn}
                onPress={() => void loadPage(page + 1, { append: true })}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={JP.brand} />
                ) : (
                  <Text style={styles.moreText}>Charger plus</Text>
                )}
              </Pressable>
            ) : items.length > 0 ? (
              <Text style={styles.endHint}>
                Page {meta.current_page ?? page}/{meta.last_page ?? 1}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const ok = item.result === 'valid';
            return (
              <AgentListCard
                onPress={() => {
                  startNewVerification();
                }}
              >
                <View style={styles.row}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: ok ? '#ECFDF3' : '#FEF2F2' },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color={ok ? JP.success : JP.danger}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.kind}>
                      {item.context === 'attendance' ? 'Présence' : 'Identité'}
                      {item.context ? ` · ${item.context}` : ''}
                    </Text>
                    <Text style={styles.title}>
                      {item.member?.full_name ?? 'Carte introuvable'}
                    </Text>
                    <Text style={styles.sub}>
                      {item.member?.member_code ?? '—'}
                      {item.verified_by ? ` · ${item.verified_by}` : ''}
                    </Text>
                    <Text style={styles.time}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.rightCol}>
                    <Text style={[styles.status, { color: ok ? JP.success : JP.danger }]}>
                      {ok ? 'OK' : item.result}
                    </Text>
                    <Text style={styles.newHint}>Nouvelle</Text>
                  </View>
                </View>
              </AgentListCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  toolbar: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  linkText: { flex: 1, fontSize: 13, fontWeight: '700', color: JP.brand },
  pad: { padding: 16 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kind: {
    fontSize: 11,
    fontWeight: '800',
    color: JP.muted,
    textTransform: 'uppercase',
  },
  title: { marginTop: 2, fontSize: 15, fontWeight: '800', color: JP.text },
  sub: { marginTop: 2, fontSize: 12, color: JP.muted },
  time: { marginTop: 6, fontSize: 11, color: JP.muted, fontWeight: '600' },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  status: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  newHint: { fontSize: 10, fontWeight: '700', color: JP.brand },
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
  endHint: {
    textAlign: 'center',
    color: JP.muted,
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 12,
  },
});
