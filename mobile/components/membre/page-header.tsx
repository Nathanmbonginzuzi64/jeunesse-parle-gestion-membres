import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationsInboxModal } from '@/components/membre/notifications-inbox-modal';
import { api, getToken } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
  children?: ReactNode;
  showScrollHandle?: boolean;
  rightSlot?: ReactNode;
};

export function MembrePageHeader({
  title,
  subtitle,
  icon = 'sparkles-outline',
  showBack = false,
  onBack,
  showNotifications = true,
  children,
  showScrollHandle = true,
  rightSlot,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    if (!showNotifications) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.get<{ count?: number }>('/notifications/unread-count');
      setUnread(res.count ?? 0);
    } catch {
      /* ignore */
    }
  }, [showNotifications]);

  useFocusEffect(
    useCallback(() => {
      void loadUnread();
    }, [loadUnread]),
  );

  useBackgroundRefresh(loadUnread, { enabled: showNotifications });

  return (
    <>
      <View style={[styles.stickyTop, { paddingTop: Math.max(insets.top, 6) }]}>
        <View style={styles.greetingCard}>
          {showBack ? (
            <Pressable
              onPress={() => (onBack ? onBack() : router.back())}
              style={styles.iconWrap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back" size={18} color={JP.onBrand} />
            </Pressable>
          ) : (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={18} color={JP.onBrand} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {rightSlot}

          {!rightSlot && showNotifications ? (
            <Pressable
              onPress={() => setNotificationsOpen(true)}
              hitSlop={8}
              style={styles.bellBtn}
              accessibilityLabel={
                unread > 0 ? `Notifications, ${unread} non lues` : 'Notifications'
              }
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={18} color={JP.onBrand} />
              {unread > 0 ? (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unread > 99 ? '99+' : String(unread)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>

        {children}

        {showScrollHandle ? (
          <View style={styles.scrollSeparator} pointerEvents="none">
            <View style={styles.scrollHandle} />
          </View>
        ) : null}
      </View>

      {showNotifications ? (
        <NotificationsInboxModal
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          unreadCount={unread}
          onUnreadChange={setUnread}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  stickyTop: {
    zIndex: 20,
    elevation: 14,
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: JP.bg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: JP.border,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  greetingCard: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: JP.brand,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: JP.onBrand,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    borderWidth: 1.5,
    borderColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: JP.onBrand,
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  scrollSeparator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 2,
  },
  scrollHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: JP.border,
  },
});
