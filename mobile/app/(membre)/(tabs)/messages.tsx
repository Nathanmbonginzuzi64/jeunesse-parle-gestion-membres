import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { api } from '@/lib/api';
import {
  categoryLabel,
  chatTitle,
  formatRelative,
  statusLabel,
  type ChatConversationItem,
  type JpMessageItem,
} from '@/lib/jp-message';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type TabKey = 'chats' | 'tickets';

export default function MembreMessagesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('chats');
  const [chats, setChats] = useState<ChatConversationItem[]>([]);
  const [tickets, setTickets] = useState<JpMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      const [chatRes, ticketRes] = await Promise.all([
        api.get<{ data: ChatConversationItem[] }>('/jp-messages/chats', { per_page: 50 }),
        api.get<{ data: JpMessageItem[] }>('/jp-messages', { per_page: 50, mine: 1 }),
      ]);
      setChats(chatRes.data ?? []);
      setTickets(ticketRes.data ?? []);
    } catch {
      if (!silent) {
        setChats([]);
        setTickets([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load({ silent: true });
    }, [load]),
  );

  useBackgroundRefresh(() => load({ silent: true }));

  const unreadChats = useMemo(() => chats.filter((c) => c.unread).length, [chats]);

  const subtitle = loading
    ? 'Chargement…'
    : tab === 'chats'
      ? `${chats.length} conversation${chats.length > 1 ? 's' : ''}${
          unreadChats ? ` · ${unreadChats} non lu${unreadChats > 1 ? 's' : ''}` : ''
        }`
      : `${tickets.length} dossier${tickets.length > 1 ? 's' : ''}`;

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="JP Message"
        subtitle={subtitle}
        icon="chatbubbles"
        showNotifications={false}
        rightSlot={
          <Pressable
            onPress={() => router.push('/(membre)/jp-message/nouveau')}
            style={styles.newBtn}
            hitSlop={8}
            accessibilityLabel="Nouveau message"
          >
            <Ionicons name="add" size={22} color={JP.white} />
          </Pressable>
        }
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
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('chats')}
            style={[styles.tab, tab === 'chats' && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === 'chats' && styles.tabTextOn]}>
              Conversations
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('tickets')}
            style={[styles.tab, tab === 'tickets' && styles.tabOn]}
          >
            <Text style={[styles.tabText, tab === 'tickets' && styles.tabTextOn]}>Dossiers</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.composeCard}
          onPress={() => router.push('/(membre)/jp-message/nouveau')}
        >
          <View style={styles.composeIcon}>
            <Ionicons name="create-outline" size={18} color={JP.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.composeTitle}>Nouveau</Text>
            <Text style={styles.composeSub}>Contacter un responsable ou ouvrir un dossier</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={JP.muted} />
        </Pressable>

        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 24 }} />
        ) : tab === 'chats' ? (
          chats.length === 0 ? (
            <EmptyState
              title="Aucune conversation"
              subtitle="Écrivez à un responsable via Nouveau → Contacter."
            />
          ) : (
            <View style={styles.list}>
              {chats.map((item) => {
                const title = chatTitle(item);
                return (
                  <Pressable
                    key={`c-${item.id}`}
                    style={[styles.card, item.unread && styles.cardUnread]}
                    onPress={() => router.push(`/(membre)/chat/${item.id}`)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{title.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.rowBetween}>
                        <Text style={styles.title} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={styles.time}>{formatRelative(item.last_message_at)}</Text>
                      </View>
                      {item.peer?.role ? (
                        <Text style={styles.meta} numberOfLines={1}>
                          {item.peer.role}
                          {item.kind === 'chef_membre' ? ' · Chef ↔ membre' : ''}
                        </Text>
                      ) : null}
                      <Text
                        style={[styles.preview, item.unread && styles.previewUnread]}
                        numberOfLines={1}
                      >
                        {item.last_message_preview || 'Aucun message'}
                      </Text>
                    </View>
                    {item.unread ? <View style={styles.dot} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )
        ) : tickets.length === 0 ? (
          <EmptyState
            title="Aucun dossier"
            subtitle="Ouvrez une demande, plainte ou suggestion via Nouveau → Dossier officiel."
          />
        ) : (
          <View style={styles.list}>
            {tickets.map((item) => (
              <Pressable
                key={`t-${item.id}`}
                style={styles.card}
                onPress={() => router.push(`/(membre)/jp-message/dossier/${item.id}`)}
              >
                <View style={[styles.ticketDot, item.status === 'open' && styles.ticketDotOpen]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.reference} · {categoryLabel(item.category)} · {statusLabel(item.status)}
                  </Text>
                  <Text style={styles.preview} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={JP.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E8EEF4',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabOn: { backgroundColor: JP.white },
  tabText: { fontSize: 13, fontWeight: '700', color: JP.muted },
  tabTextOn: { color: JP.brandDark },
  composeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    borderStyle: 'dashed',
    padding: 12,
    marginBottom: 14,
  },
  composeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeTitle: { fontSize: 14, fontWeight: '800', color: JP.text },
  composeSub: { marginTop: 2, fontSize: 12, color: JP.muted },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '800', color: JP.text },
  time: { fontSize: 11, fontWeight: '600', color: JP.muted },
  meta: { marginTop: 2, fontSize: 11, color: JP.muted, fontWeight: '600' },
  preview: { marginTop: 3, fontSize: 12, color: JP.muted },
  previewUnread: { color: JP.text, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: JP.brand },
  ticketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JP.muted,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  ticketDotOpen: { backgroundColor: JP.brand },
});
