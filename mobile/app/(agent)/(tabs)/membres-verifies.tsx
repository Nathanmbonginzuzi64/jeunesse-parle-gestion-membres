import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { AgentListCard } from '@/components/agent/agent-ui';
import { AgentSearchBar } from '@/components/agent/agent-search';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type VerifiedMember = {
  member_id: number;
  member_code: string | null;
  full_name: string | null;
  photo_url?: string | null;
  structure?: string | null;
  verifications_count: number;
  last_verified_at: string | null;
  last_context?: string | null;
};

type Meta = {
  current_page?: number;
  last_page?: number;
  total?: number;
};

export default function MembresVerifiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<VerifiedMember[]>([]);
  const [meta, setMeta] = useState<Meta>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVerify = can(PERMISSIONS.cardsVerify);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  const load = useCallback(
    async (pageNumber = 1, append = false, opts?: { silent?: boolean }) => {
      if (!canVerify) {
        setLoading(false);
        setError('Permission cards.verify requise.');
        return;
      }
      const silent = Boolean(opts?.silent);
      if (append) setLoadingMore(true);
      else if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await api.get<{ data: VerifiedMember[]; meta?: Meta }>(
          '/verifications/members',
          {
            page: pageNumber,
            per_page: 25,
            q: debouncedQ || undefined,
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
          setError(err instanceof ApiError ? err.message : 'Liste indisponible.');
        }
      } finally {
        if (!silent) setLoading(false);
        setLoadingMore(false);
      }
    },
    [canVerify, debouncedQ],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  useBackgroundRefresh(() => load(1, false, { silent: true }), {
    enabled: canVerify,
    intervalMs: 8000,
  });

  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Membres vérifiés"
        subtitle={`${meta.total ?? items.length} membre(s)`}
        icon="people-outline"
        showBack
      />

      <View style={styles.searchWrap}>
        <AgentSearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Nom, code JP-RDC…"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.member_id)}
        refreshing={loading}
        onRefresh={() => void load(1)}
        contentContainerStyle={[styles.list, { paddingBottom: 28 + insets.bottom }]}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={error ? 'Chargement impossible' : 'Aucun membre vérifié'}
              subtitle={error ?? 'Les membres validés apparaîtront ici.'}
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
          <AgentListCard
            onPress={() =>
              router.push({
                pathname: '/(agent)/(tabs)/fiche-membre',
                params: {
                  memberId: String(item.member_id),
                  memberCode: item.member_code ?? '',
                },
              })
            }
          >
            <View style={styles.row}>
              <AuthenticatedImage
                uri={resolveMediaUrl(item.photo_url)}
                memberCode={item.member_code}
                style={styles.avatar}
                fallbackLetter={item.full_name ?? '?'}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.full_name ?? 'Membre'}
                </Text>
                <Text style={styles.meta}>
                  {item.member_code ?? '—'}
                  {item.structure ? ` · ${item.structure}` : ''}
                </Text>
                <Text style={styles.time}>
                  {item.verifications_count} vérif.
                  {item.last_verified_at
                    ? ` · ${new Date(item.last_verified_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={JP.muted} />
            </View>
          </AgentListCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  name: { fontSize: 15, fontWeight: '800', color: JP.text },
  meta: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
  time: { marginTop: 4, fontSize: 11, color: JP.muted, fontWeight: '600' },
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
