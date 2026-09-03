import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { MembrePageHeader } from '@/components/membre/page-header';
import { api, ApiError } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

export type AppNotification = {
  id: number;
  type?: string;
  category?: string | null;
  title: string;
  body?: string | null;
  level?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at?: string | null;
};

const LEVEL_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; chipBg: string }
> = {
  success: {
    label: 'Succès',
    icon: 'checkmark-done',
    bg: '#ECFDF3',
    fg: '#067647',
    chipBg: '#D1FADF',
  },
  info: {
    label: 'Information',
    icon: 'information-circle',
    bg: '#E7F4FB',
    fg: JP.brandDark,
    chipBg: '#D6EAF8',
  },
  warning: {
    label: 'Avertissement',
    icon: 'warning',
    bg: '#FFFAEB',
    fg: '#B54708',
    chipBg: '#FEDF89',
  },
  danger: {
    label: 'Urgent',
    icon: 'shield',
    bg: '#FEF3F2',
    fg: '#B42318',
    chipBg: '#FECDCA',
  },
};

function levelMeta(level?: string) {
  return LEVEL_META[level ?? 'info'] ?? LEVEL_META.info;
}

function formatRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString('fr-FR');
}

export default function MembreNotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get<{ data: AppNotification[] }>('/notifications', { page: 1, per_page: 40 }),
        api.get<{ count?: number }>('/notifications/unread-count'),
      ]);
      setItems(listRes.data ?? []);
      setUnreadCount(Number(countRes.count ?? 0));
      setError(null);
    } catch (caught) {
      if (!silent) {
        setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useBackgroundRefresh(() => load({ silent: true }));

  async function markOne(id: number) {
    const target = items.find((item) => item.id === id);
    if (!target || target.is_read) return;
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      /* silencieux */
    }
  }

  async function markAll() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setItems((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      /* silencieux */
    } finally {
      setMarkingAll(false);
    }
  }

  function openDetail(item: AppNotification) {
    setSelected({
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    });
    if (!item.is_read) void markOne(item.id);
  }

  const detailMeta = selected ? levelMeta(selected.level) : null;

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title={selected ? 'Détail' : 'Notifications'}
        subtitle={
          selected
            ? selected.title
            : unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Vous êtes à jour'
        }
        icon="notifications-outline"
        showBack
        onBack={() => (selected ? setSelected(null) : router.back())}
        showNotifications={false}
        rightSlot={
          !selected ? (
            <Pressable
              onPress={() => void markAll()}
              disabled={unreadCount === 0 || markingAll}
              style={[styles.markAllBtn, (unreadCount === 0 || markingAll) && { opacity: 0.45 }]}
            >
              <Ionicons name="checkmark-done" size={16} color={JP.white} />
            </Pressable>
          ) : null
        }
      />

      {selected && detailMeta ? (
        <ScrollView contentContainerStyle={styles.detailPad} showsVerticalScrollIndicator={false}>
          <View style={[styles.detailCard, { backgroundColor: detailMeta.bg }]}>
            <View style={styles.detailIconWrap}>
              <Ionicons name={detailMeta.icon} size={20} color={detailMeta.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.chip, { backgroundColor: detailMeta.chipBg }]}>
                <Text style={[styles.chipText, { color: detailMeta.fg }]}>{detailMeta.label}</Text>
              </View>
              <Text style={styles.detailTitle}>{selected.title}</Text>
            </View>
          </View>
          {selected.body ? (
            <Text style={styles.detailBody}>{selected.body}</Text>
          ) : (
            <Text style={styles.detailEmpty}>Aucun message complémentaire.</Text>
          )}
          <Text style={styles.detailDate}>{formatRelative(selected.created_at)}</Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listPad}
          showsVerticalScrollIndicator={false}
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
            <ActivityIndicator color={JP.brand} style={{ marginTop: 32 }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={36} color={JP.muted} />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>Les alertes et messages officiels apparaîtront ici.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item) => {
                const meta = levelMeta(item.level);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openDetail(item)}
                    style={({ pressed }) => [
                      styles.row,
                      !item.is_read && styles.rowUnread,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.fg} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.rowTop}>
                        <Text
                          style={[styles.rowTitle, !item.is_read && styles.rowTitleUnread]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.is_read ? <View style={styles.unreadDot} /> : null}
                      </View>
                      {item.body ? (
                        <Text style={styles.rowBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                      ) : null}
                      <Text style={styles.rowDate}>{formatRelative(item.created_at)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  markAllBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPad: { padding: 16, paddingBottom: 36 },
  detailPad: { padding: 16, paddingBottom: 36 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
  },
  rowUnread: {
    backgroundColor: '#F3FAFE',
    borderColor: '#C5E4F5',
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: JP.text },
  rowTitleUnread: { fontWeight: '800' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JP.brand,
  },
  rowBody: { marginTop: 4, fontSize: 12, color: JP.muted, lineHeight: 17 },
  rowDate: { marginTop: 6, fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  detailCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: JP.border,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '800',
    color: JP.text,
    lineHeight: 22,
  },
  detailBody: {
    marginTop: 16,
    fontSize: 14,
    color: JP.text,
    lineHeight: 22,
  },
  detailEmpty: {
    marginTop: 16,
    fontSize: 13,
    fontStyle: 'italic',
    color: JP.muted,
  },
  detailDate: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: JP.text },
  emptySub: { fontSize: 13, color: JP.muted, textAlign: 'center', paddingHorizontal: 24 },
  error: { textAlign: 'center', color: JP.danger, marginTop: 32, fontSize: 13 },
});
