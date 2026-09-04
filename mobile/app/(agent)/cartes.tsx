import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { AgentChip } from '@/components/agent/agent-ui';
import { AgentSearchBar } from '@/components/agent/agent-search';
import { MemberCardVisual } from '@/components/membre/member-card-visual';
import type { CardRender } from '@/components/membre/member-card-types';
import { Badge } from '@/components/ui';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type CardVisualItem = {
  member_id: number;
  member_code: string;
  full_name: string;
  card: {
    id: number;
    card_number: string;
    status: string;
    status_label: string;
    is_valid?: boolean;
  };
  render: CardRender;
};

type Meta = {
  current_page?: number;
  last_page?: number;
  total?: number;
};

const STATUS_FILTERS = [
  { key: '', label: 'Toutes' },
  { key: 'active', label: 'Actives' },
  { key: 'expired', label: 'Expirées' },
  { key: 'suspended', label: 'Suspendues' },
] as const;

export default function AgentCartesGalerieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { can } = useAuth();
  const canView = can(PERMISSIONS.cardsView);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<CardVisualItem[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = Math.min(screenW - 48, 420);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (pageNumber = 1, append = false, opts?: { silent?: boolean }) => {
      if (!canView) {
        setLoading(false);
        setError('Permission cards.view requise.');
        return;
      }

      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get<{ data: CardVisualItem[]; meta?: Meta }>('/cards/visual', {
          page: pageNumber,
          per_page: 10,
          q: debouncedQ || undefined,
          status: status || undefined,
        });

        const rows = (response.data ?? []).map((item) => ({
          ...item,
          render: {
            ...item.render,
            photo_url: resolveMediaUrl(item.render.photo_url),
          },
        }));

        setMeta(response.meta ?? {});
        setPage(pageNumber);
        setItems((current) => (append ? [...current, ...rows] : rows));
        if (!silent) setError(null);
      } catch (err) {
        if (!append && !silent) {
          setItems([]);
          setError(err instanceof ApiError ? err.message : 'Galerie indisponible.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [canView, debouncedQ, status],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useBackgroundRefresh(() => load(1, false, { silent: true }), {
    enabled: canView,
    intervalMs: 8000,
  });

  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);
  const total = meta.total ?? items.length;

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Cartes membres"
        subtitle={loading ? 'Chargement…' : `${total} carte(s) — design officiel`}
        icon="card-outline"
        showBack
      />

      <View style={styles.toolbar}>
        <AgentSearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Nom, code JP-RDC, n° carte…"
        />
        <View style={styles.filters}>
          {STATUS_FILTERS.map((opt) => (
            <AgentChip
              key={opt.key || 'all'}
              label={opt.label}
              active={status === opt.key}
              onPress={() => setStatus(opt.key)}
            />
          ))}
        </View>
      </View>

      {!canView ? (
        <View style={styles.pad}>
          <EmptyState
            title="Accès restreint"
            subtitle="Permission cards.view requise pour consulter la galerie."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.card.id)}
          refreshing={loading}
          onRefresh={() => void load(1)}
          contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title={error ? 'Chargement impossible' : 'Aucune carte'}
                subtitle={error ?? 'Aucune carte ne correspond à votre recherche.'}
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
                  <Text style={styles.moreText}>Charger plus</Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.article}
              onPress={() =>
                router.push({
                  pathname: '/(agent)/carte/[memberId]',
                  params: { memberId: String(item.member_id) },
                })
              }
            >
              <View style={styles.cardStage}>
                <MemberCardVisual render={item.render} width={cardWidth} />
              </View>
              <View style={styles.metaRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text style={styles.code}>{item.card.card_number}</Text>
                  <Text style={styles.memberCode}>{item.member_code}</Text>
                </View>
                <Badge
                  label={item.card.status_label}
                  tone={item.card.status === 'active' ? 'success' : 'neutral'}
                />
              </View>
              <View style={styles.cta}>
                <Ionicons name="eye-outline" size={16} color={JP.brand} />
                <Text style={styles.ctaText}>Aperçu recto / verso</Text>
                <Ionicons name="chevron-forward" size={16} color={JP.brand} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  toolbar: { paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pad: { padding: 16 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  article: {
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    overflow: 'hidden',
  },
  cardStage: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  name: { fontSize: 15, fontWeight: '800', color: JP.text },
  code: { marginTop: 2, fontSize: 12, fontWeight: '700', color: JP.brand, fontFamily: 'monospace' },
  memberCode: { marginTop: 2, fontSize: 11, color: JP.muted, fontFamily: 'monospace' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
    marginTop: 10,
  },
  ctaText: { flex: 1, fontSize: 13, fontWeight: '700', color: JP.brand },
  moreBtn: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    paddingVertical: 12,
    alignItems: 'center',
  },
  moreText: { color: JP.brand, fontWeight: '800', fontSize: 13 },
});
