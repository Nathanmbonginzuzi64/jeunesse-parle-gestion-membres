import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError, getToken } from '@/lib/api';
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

export function NotificationsInboxModal({
  open,
  onClose,
  unreadCount,
  onUnreadChange,
}: {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadChange?: (count: number) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('Session inactive. Reconnectez-vous pour voir vos notifications.');
        setItems([]);
        return;
      }
      const response = await api.get<{ data: AppNotification[] }>('/notifications', {
        page: 1,
        per_page: 8,
      });
      setItems(response.data ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      return;
    }
    void load();
  }, [open, load]);

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
      onUnreadChange?.(Math.max(0, unreadCount - 1));
    } catch {
      /* silencieux */
    }
  }

  async function markAll() {
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
      onUnreadChange?.(0);
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

  function openAll() {
    onClose();
    router.push('/(membre)/notifications');
  }

  const detailMeta = selected ? levelMeta(selected.level) : null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.panel,
            {
              marginTop: Math.max(insets.top, 12) + 56,
              marginBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {selected ? (
                <Pressable onPress={() => setSelected(null)} style={styles.backBtn} hitSlop={8}>
                  <Ionicons name="arrow-back" size={16} color={JP.brand} />
                  <Text style={styles.backText}>Retour</Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.title}>Notifications</Text>
                  <Text style={styles.subtitle}>
                    {unreadCount > 0
                      ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
                      : 'Vous êtes à jour'}
                  </Text>
                </>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn} accessibilityLabel="Fermer">
              <Ionicons name="close" size={18} color={JP.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {selected && detailMeta ? (
              <View style={styles.detail}>
                <View style={[styles.detailCard, { backgroundColor: detailMeta.bg }]}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name={detailMeta.icon} size={18} color={detailMeta.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.chip, { backgroundColor: detailMeta.chipBg }]}>
                      <Text style={[styles.chipText, { color: detailMeta.fg }]}>
                        {detailMeta.label}
                      </Text>
                    </View>
                    <Text style={styles.detailTitle}>{selected.title}</Text>
                  </View>
                </View>
                {selected.body ? (
                  <Text style={styles.detailBody}>{selected.body}</Text>
                ) : (
                  <Text style={styles.detailEmpty}>Aucun message complémentaire.</Text>
                )}
                <Text style={styles.rowDate}>{formatRelative(selected.created_at)}</Text>
              </View>
            ) : (
              <>
                {loading ? (
                  <ActivityIndicator color={JP.brand} style={{ marginVertical: 28 }} />
                ) : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                {!loading && !error && items.length === 0 ? (
                  <Text style={styles.empty}>Aucune notification pour le moment.</Text>
                ) : null}
                {!loading &&
                  items.map((item) => {
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
                          <Ionicons name={meta.icon} size={16} color={meta.fg} />
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
              </>
            )}
          </ScrollView>

          {!selected ? (
            <View style={styles.footer}>
              <Pressable
                onPress={() => void markAll()}
                disabled={unreadCount === 0 || markingAll}
                style={[styles.footerBtn, (unreadCount === 0 || markingAll) && { opacity: 0.4 }]}
              >
                <Ionicons name="checkmark-done" size={15} color={JP.brand} />
                <Text style={styles.footerBtnText}>{markingAll ? '…' : 'Tout lire'}</Text>
              </Pressable>
              <Pressable onPress={openAll} style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Voir tout</Text>
                <Ionicons name="open-outline" size={13} color={JP.brand} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    paddingHorizontal: 14,
  },
  panel: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: 380,
    maxHeight: '72%',
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    overflow: 'hidden',
    shadowColor: '#0B1F33',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: JP.border,
  },
  title: { fontSize: 15, fontWeight: '800', color: JP.text },
  subtitle: { marginTop: 2, fontSize: 11, fontWeight: '600', color: JP.muted },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  backText: { fontSize: 12, fontWeight: '700', color: JP.brand },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: JP.bg,
  },
  body: { flexGrow: 0 },
  bodyContent: { paddingVertical: 4 },
  detail: { padding: 14, gap: 12 },
  detailCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: JP.border,
  },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  detailTitle: { marginTop: 6, fontSize: 14, fontWeight: '800', color: JP.text, lineHeight: 20 },
  detailBody: { fontSize: 13, color: JP.text, lineHeight: 19 },
  detailEmpty: { fontSize: 12, fontStyle: 'italic', color: JP.muted },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  rowUnread: { backgroundColor: '#F3FAFE' },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: JP.text },
  rowTitleUnread: { fontWeight: '800' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: JP.brand },
  rowBody: { marginTop: 3, fontSize: 11, color: JP.muted, lineHeight: 16 },
  rowDate: { marginTop: 5, fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  empty: {
    textAlign: 'center',
    color: JP.muted,
    fontSize: 12,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  error: {
    textAlign: 'center',
    color: JP.danger,
    fontSize: 12,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
    backgroundColor: '#F8FAFC',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  footerBtnText: { fontSize: 12, fontWeight: '700', color: JP.brand },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerLinkText: { fontSize: 12, fontWeight: '700', color: JP.brand },
});
