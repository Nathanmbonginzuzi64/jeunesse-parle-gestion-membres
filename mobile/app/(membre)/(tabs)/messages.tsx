import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { api } from '@/lib/api';
import { JP } from '@/constants/theme';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';

type ChatRow = {
  id: number;
  type?: string;
  kind?: string;
  subject?: string | null;
  title?: string | null;
  peer?: { name?: string } | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread?: boolean;
};

type FilterKey = 'all' | 'private' | 'group' | 'admin';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'private', label: 'Privées' },
  { key: 'group', label: 'Groupes' },
  { key: 'admin', label: 'Admin' },
];

export default function MembreMessagesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ChatRow[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{ data: ChatRow[] }>('/jp-messages/chats', { per_page: 50 });
      setItems(response.data ?? []);
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

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'private') {
      return items.filter((item) => item.type === 'direct' || item.kind === 'peer' || !item.type);
    }
    if (filter === 'group') {
      return items.filter((item) => item.type === 'group' || item.kind === 'group');
    }
    return items.filter(
      (item) =>
        item.kind === 'admin' ||
        item.kind === 'chef_membre' ||
        (item.peer?.name ?? '').toLowerCase().includes('admin'),
    );
  }, [items, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Messages"
        subtitle={
          loading
            ? 'Chargement…'
            : `${filtered.length} conversation${filtered.length > 1 ? 's' : ''}`
        }
        icon="chatbubbles"
      />
      <Screen
        style={{ backgroundColor: JP.bg, paddingTop: 8 }}
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
      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const on = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={JP.brand} style={{ marginTop: 24 }} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun message"
          subtitle="Vos conversations avec l’équipe apparaîtront ici."
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => {
            const title =
              item.peer?.name || item.title || item.subject || `Conversation #${item.id}`;
            return (
              <Pressable
                key={item.id}
                style={[styles.card, item.unread && styles.cardUnread]}
                onPress={() => router.push(`/(membre)/chat/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{title.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.last_message_preview || 'Aucun message'}
                  </Text>
                </View>
                {item.unread ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
  },
  chipOn: { backgroundColor: JP.brandLight, borderColor: JP.brand },
  chipText: { fontSize: 12, fontWeight: '700', color: JP.muted },
  chipTextOn: { color: JP.brandDark },
  list: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
  },
  cardUnread: { borderColor: JP.brand },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: JP.brand },
  title: { fontSize: 14, fontWeight: '800', color: JP.text },
  preview: { marginTop: 3, fontSize: 12, color: JP.muted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: JP.brand },
});
