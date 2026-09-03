import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type TabKey = 'upcoming' | 'mine' | 'past';

type ActivityRow = {
  id: number;
  title: string;
  code?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  status_label?: string;
  type_label?: string;
  is_registered?: boolean;
  image_url?: string | null;
  description?: string | null;
};

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'upcoming', label: 'À venir', icon: 'calendar-outline' },
  { key: 'mine', label: 'Mes activités', icon: 'checkmark-circle-outline' },
  { key: 'past', label: 'Passées', icon: 'time-outline' },
];

function formatWhen(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date.replace('.', '')} · ${time}`;
}

function emptyCopy(tab: TabKey) {
  if (tab === 'mine') {
    return {
      title: 'Aucune inscription',
      subtitle: 'Les activités auxquelles vous vous inscrivez apparaîtront ici.',
    };
  }
  if (tab === 'past') {
    return {
      title: 'Aucune activité passée',
      subtitle: 'L’historique de vos activités s’affichera ici.',
    };
  }
  return {
    title: 'Aucune activité à venir',
    subtitle: 'Les prochaines activités de votre structure apparaîtront ici.',
  };
}

export default function MembreActivitesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{ data: ActivityRow[] }>('/activities/for-member', {
        tab,
        per_page: 40,
        q: query.trim() || undefined,
      });
      setItems(
        (response.data ?? []).map((item) => ({
          ...item,
          image_url: resolveMediaUrl(item.image_url),
        })),
      );
    } catch {
      if (!silent) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => void load(), query ? 280 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  useBackgroundRefresh(() => load({ silent: true }));

  const registeredCount = useMemo(
    () => items.filter((item) => item.is_registered).length,
    [items],
  );

  async function register(id: number) {
    setBusyId(id);
    try {
      await api.post(`/activities/${id}/register`);
      Alert.alert('Inscription', 'Vous êtes inscrit(e) à cette activité.', [
        {
          text: 'Voir le détail',
          onPress: () => {
            setTab('mine');
            router.push(`/(membre)/activite/${id}`);
          },
        },
        {
          text: 'Mes activités',
          onPress: () => setTab('mine'),
        },
      ]);
      await load();
    } catch (error) {
      Alert.alert(
        'Impossible',
        error instanceof ApiError ? error.message : 'Inscription impossible.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const empty = emptyCopy(tab);

  const subtitle = loading
    ? 'Chargement…'
    : items.length === 0
      ? 'Rien à afficher pour cet onglet'
      : `${items.length} activité${items.length > 1 ? 's' : ''}${
          tab === 'upcoming' && registeredCount > 0
            ? ` · ${registeredCount} inscription${registeredCount > 1 ? 's' : ''}`
            : ''
        }`;

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF3F8' }}>
      <MembrePageHeader title="Activités" subtitle={subtitle} icon="calendar" />
      <Screen
        style={{ backgroundColor: '#EEF3F8', paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 32 }}
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
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={JP.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une activité…"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => {
          const on = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Ionicons name={item.icon} size={14} color={on ? JP.white : JP.muted} />
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={JP.brand} />
          <Text style={styles.loadingText}>Chargement des activités…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={28} color={JP.brand} />
          </View>
          <Text style={styles.emptyTitle}>{empty.title}</Text>
          <Text style={styles.emptySub}>{empty.subtitle}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const when = formatWhen(item.starts_at);
            const busy = busyId === item.id;
            const past = tab === 'past';

            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(membre)/activite/${item.id}`)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
              >
                <AuthenticatedImage
                  uri={item.image_url}
                  activityCode={item.code}
                  fallbackLetter={item.title}
                  style={styles.thumb}
                />

                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.type_label ? (
                      <View style={styles.typeChip}>
                        <Text style={styles.typeChipText}>{item.type_label}</Text>
                      </View>
                    ) : null}
                  </View>

                  {when ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={JP.muted} />
                      <Text style={styles.meta} numberOfLines={1}>
                        {when}
                      </Text>
                    </View>
                  ) : null}

                  {item.location ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={13} color={JP.muted} />
                      <Text style={styles.meta} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  ) : null}

                  {item.status_label ? (
                    <Text style={styles.status}>{item.status_label}</Text>
                  ) : null}
                </View>

                {!past ? (
                  item.is_registered ? (
                    <View style={styles.pillOk}>
                      <Ionicons name="checkmark" size={13} color={JP.white} />
                      <Text style={styles.pillOkText}>Inscrit</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation?.();
                        void register(item.id);
                      }}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.pillAction,
                        pressed && { opacity: 0.9 },
                        busy && { opacity: 0.55 },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={JP.brand} />
                      ) : (
                        <Text style={styles.pillActionText}>S'inscrire</Text>
                      )}
                    </Pressable>
                  )
                ) : item.is_registered ? (
                  <View style={styles.pillMuted}>
                    <Text style={styles.pillMutedText}>Participé</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={JP.muted} />
                )}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: JP.text,
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  tabOn: { backgroundColor: JP.brand },
  tabText: { fontSize: 11, fontWeight: '700', color: JP.muted },
  tabTextOn: { color: JP.white },
  loadingBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: { fontSize: 12, color: JP.muted, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 18,
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: JP.text, textAlign: 'center' },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: JP.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: { gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: JP.brandLight,
  },
  info: { flex: 1, minWidth: 0 },
  titleRow: { gap: 4, marginBottom: 4 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: JP.text,
    lineHeight: 18,
  },
  typeChip: {
    alignSelf: 'flex-start',
    backgroundColor: JP.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: JP.brandDark,
    textTransform: 'uppercase',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: JP.muted,
    fontWeight: '600',
  },
  status: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: JP.brandDark,
  },
  pillOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: JP.brand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillOkText: { color: JP.white, fontSize: 11, fontWeight: '800' },
  pillAction: {
    borderWidth: 1.5,
    borderColor: JP.brand,
    backgroundColor: JP.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 78,
    alignItems: 'center',
  },
  pillActionText: { color: JP.brand, fontSize: 11, fontWeight: '800' },
  pillMuted: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillMutedText: { color: JP.muted, fontSize: 11, fontWeight: '800' },
});
