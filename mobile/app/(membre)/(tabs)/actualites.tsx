import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { NewsPostCard } from '@/components/membre/news-post-card';
import { api, resolveMediaUrl } from '@/lib/api';
import type { NewsPostItem } from '@/lib/news';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

const PAGE_SIZE = 10;

function mapPost(item: NewsPostItem): NewsPostItem {
  return {
    ...item,
    media_url: resolveMediaUrl(item.media_url),
    gallery_urls: (item.gallery_urls ?? [])
      .map((url) => resolveMediaUrl(url))
      .filter(Boolean) as string[],
    likes_count: Number(item.likes_count ?? 0),
    comments_count: Number(item.comments_count ?? 0),
    shares_count: Number(item.shares_count ?? 0),
    views_count: Number(item.views_count ?? 0),
  };
}

type NewsMeta = {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
};

export default function MembreActualitesScreen() {
  const [items, setItems] = useState<NewsPostItem[]>([]);
  const [meta, setMeta] = useState<NewsMeta>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPage = useCallback(async (pageNumber: number, opts?: { silent?: boolean; append?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const append = Boolean(opts?.append);
    try {
      const response = await api.get<{ data: NewsPostItem[]; meta?: NewsMeta }>('/news', {
        page: pageNumber,
        per_page: PAGE_SIZE,
      });
      const mapped = (response.data ?? []).map(mapPost);
      setMeta(response.meta ?? {});
      setPage(pageNumber);
      setItems((current) => (append ? [...current, ...mapped] : mapped));
    } catch {
      if (!silent && !append) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  useBackgroundRefresh(() => loadPage(1, { silent: true }), { intervalMs: 20_000 });

  const hasMore = (meta.current_page ?? page) < (meta.last_page ?? 1);
  const total = meta.total ?? items.length;

  async function onLoadMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadPage(page + 1, { append: true });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF3F8' }}>
      <MembrePageHeader
        title="Actualités"
        subtitle={
          loading
            ? 'Chargement…'
            : items.length === 0
              ? 'Aucune publication'
              : `${items.length}${total > items.length ? ` / ${total}` : ''} publication${
                  total > 1 ? 's' : ''
                }`
        }
        icon="newspaper"
      />
      <Screen
        style={{ backgroundColor: '#EEF3F8', paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadPage(1).finally(() => setRefreshing(false));
            }}
            tintColor={JP.brand}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune actualité"
            subtitle="Les publications officielles apparaîtront ici."
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <NewsPostCard
                key={item.id}
                post={item}
                compact
                onUpdated={(next) =>
                  setItems((current) => current.map((row) => (row.id === next.id ? next : row)))
                }
              />
            ))}

            {hasMore ? (
              <Pressable
                style={[styles.moreBtn, loadingMore && { opacity: 0.7 }]}
                onPress={() => void onLoadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator color={JP.brand} />
                ) : (
                  <Text style={styles.moreText}>
                    Voir plus d’actualités ({Math.min(PAGE_SIZE, total - items.length)} suivantes)
                  </Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.endText}>Fin des actualités</Text>
            )}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  moreBtn: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.brand,
    backgroundColor: JP.white,
    paddingVertical: 14,
    alignItems: 'center',
  },
  moreText: { fontSize: 13, fontWeight: '800', color: JP.brand },
  endText: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: JP.muted,
    paddingVertical: 8,
  },
});
