import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
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

export default function MembreActualitesScreen() {
  const [items, setItems] = useState<NewsPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{ data: NewsPostItem[] }>('/news', { per_page: 30 });
      setItems((response.data ?? []).map(mapPost));
    } catch {
      if (!silent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useBackgroundRefresh(() => load({ silent: true }));

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF3F8' }}>
      <MembrePageHeader
        title="Actualités"
        subtitle={
          loading
            ? 'Chargement…'
            : items.length === 0
              ? 'Aucune publication'
              : `${items.length} publication${items.length > 1 ? 's' : ''}`
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
              void load().finally(() => setRefreshing(false));
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
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
});
