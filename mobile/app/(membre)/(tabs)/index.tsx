import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemberCardPreview, type CardPreviewData } from '@/components/membre/card-preview';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState, SectionHeader } from '@/components/membre/section';
import { NewsMediaBlock } from '@/components/membre/news-media';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { useAuth } from '@/lib/auth';
import { api, getToken, resolveMediaUrl, API_BASE_URL } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type ActivityRow = {
  id: number;
  title: string;
  code?: string;
  starts_at?: string | null;
  location?: string | null;
  is_registered?: boolean;
  status_label?: string;
  type_label?: string;
  image_url?: string | null;
};

type NewsRow = {
  id: number;
  title: string;
  body?: string | null;
  excerpt?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  category_label?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  gallery_urls?: string[] | null;
  external_url?: string | null;
  text_background?: string | Record<string, unknown> | null;
  author?: string | null;
};

function greetingForLocalTime(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return { label: 'Bonjour', icon: 'sunny' as const };
  }
  if (hour >= 12 && hour < 18) {
    return { label: 'Bon après-midi', icon: 'partly-sunny' as const };
  }
  if (hour >= 18 && hour < 22) {
    return { label: 'Bonsoir', icon: 'cloudy-night' as const };
  }
  return { label: 'Bonne nuit', icon: 'moon' as const };
}

function formatActivityWhen(value?: string | null) {
  if (!value) return { day: '—', month: '', time: '' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { day: '—', month: '', time: '' };
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function MembreAccueilScreen() {
  const { user, postLoginPath } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [card, setCard] = useState<CardPreviewData | null>(null);
  const [memberPhoto, setMemberPhoto] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(() => greetingForLocalTime());

  useEffect(() => {
    if (!user) return;
    if (
      user.member_status === 'pending' ||
      user.needs_structure_choice ||
      user.needs_profile_completion
    ) {
      router.replace(postLoginPath(user) as never);
    }
  }, [user, router, postLoginPath]);

  useEffect(() => {
    setGreeting(greetingForLocalTime());
    const timer = setInterval(() => setGreeting(greetingForLocalTime()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user?.member_id) {
      setLoading(false);
      return;
    }
    const silent = Boolean(opts?.silent);
    try {
      await getToken();

      const [cardRes, actRes, newsRes, meRes] = await Promise.allSettled([
        api.get<{ render?: CardPreviewData }>(`/members/${user.member_id}/card`),
        api.get<{ data: ActivityRow[] }>('/activities/for-member', { tab: 'upcoming', per_page: 3 }),
        api.get<{ data: NewsRow[] }>('/news', { per_page: 3 }),
        api.get<{ member?: { photo_url?: string | null } | null; user?: { photo_url?: string | null } }>(
          '/auth/me',
        ),
      ]);

      if (cardRes.status === 'fulfilled') {
        const render = cardRes.value.render ?? null;
        setCard(
          render
            ? {
                ...render,
                photo_url: resolveMediaUrl(render.photo_url),
                member_code: render.member_code || user.member_code || undefined,
              }
            : {
                full_name: user.name,
                member_code: user.member_code ?? undefined,
                structure: user.member_structure_name ?? undefined,
                card_status_label: 'CARTE VALIDE',
                photo_url: resolveMediaUrl(user.photo_url),
              },
        );
      } else if (!silent) {
        setCard({
          full_name: user.name,
          member_code: user.member_code ?? undefined,
          structure: user.member_structure_name ?? undefined,
          card_status_label: 'CARTE VALIDE',
          photo_url: resolveMediaUrl(user.photo_url),
        });
      }

      if (meRes.status === 'fulfilled') {
        setMemberPhoto(
          resolveMediaUrl(meRes.value.member?.photo_url) ||
            resolveMediaUrl(meRes.value.user?.photo_url) ||
            resolveMediaUrl(user.photo_url),
        );
      } else if (!silent) {
        setMemberPhoto(resolveMediaUrl(user.photo_url));
      }

      if (actRes.status === 'fulfilled') {
        setActivities(actRes.value.data ?? []);
      }
      if (newsRes.status === 'fulfilled') {
        setNews(newsRes.value.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useBackgroundRefresh(() => load({ silent: true }));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const displayName = user?.name?.trim() || 'membre';

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title={`${greeting.label}, ${displayName}`}
        subtitle={user?.member_status_label ?? 'Membre actif'}
        icon={greeting.icon}
      >
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginVertical: 18 }} />
        ) : card ? (
          <View style={styles.memberCardWrap}>
            <MemberCardPreview
              card={card}
              fallbackPhotoUrl={memberPhoto}
              onPress={() => router.push('/(membre)/ma-carte')}
            />
          </View>
        ) : null}
      </MembrePageHeader>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={[
          styles.feedContent,
          { paddingBottom: 28 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={JP.brand}
          />
        }
      >
        {loading ? null : (
          <>
            <SectionHeader
              title="Prochaines activités"
              actionLabel="Voir tout"
              onAction={() => router.push('/(membre)/(tabs)/activites')}
            />
            {activities.length === 0 ? (
              <EmptyState
                title="Aucune activité à venir"
                subtitle="Les prochaines activités de votre structure apparaîtront ici."
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityRail}
              >
                {activities.map((item) => {
                  const when = formatActivityWhen(item.starts_at);
                  const imageUri =
                    resolveMediaUrl(item.image_url) ||
                    (item.code
                      ? `${API_BASE_URL}/media/activities/${encodeURIComponent(item.code)}/image`
                      : null);
                  return (
                    <Pressable
                      key={item.id}
                      style={({ pressed }) => [styles.activityCard, pressed && { opacity: 0.94 }]}
                      onPress={() => router.push('/(membre)/(tabs)/activites')}
                    >
                      <View style={styles.activityCover}>
                        <AuthenticatedImage
                          uri={imageUri}
                          activityCode={item.code}
                          fallbackLetter={item.title}
                          style={styles.activityImage}
                        />
                        <View style={styles.activityDateBadge}>
                          <Text style={styles.dateDay}>{when.day}</Text>
                          <Text style={styles.dateMonth}>{when.month}</Text>
                        </View>
                      </View>
                      <View style={styles.activityBody}>
                        {item.type_label ? (
                          <Text style={styles.activityType}>{item.type_label}</Text>
                        ) : null}
                        <Text style={styles.activityTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={styles.metaRow}>
                          {when.time ? (
                            <View style={styles.metaItem}>
                              <Ionicons name="time-outline" size={13} color={JP.muted} />
                              <Text style={styles.rowMeta}>{when.time}</Text>
                            </View>
                          ) : null}
                          {item.location ? (
                            <View style={styles.metaItem}>
                              <Ionicons name="location-outline" size={13} color={JP.muted} />
                              <Text style={styles.rowMeta} numberOfLines={1}>
                                {item.location}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.pill,
                            item.is_registered ? styles.pillOk : styles.pillBrand,
                            styles.activityPill,
                          ]}
                        >
                          <Text
                            style={[styles.pillText, item.is_registered ? styles.pillTextOk : null]}
                          >
                            {item.is_registered ? 'Inscrit' : "S'inscrire"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <SectionHeader
              title="Actualités"
              actionLabel="Voir tout"
              onAction={() => router.push('/(membre)/(tabs)/actualites')}
            />
            {news.length === 0 ? (
              <EmptyState
                title="Pas encore d’actualité"
                subtitle="Les publications officielles arriveront ici."
              />
            ) : (
              <View style={styles.list}>
                {news.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.newsCard, pressed && { opacity: 0.92 }]}
                    onPress={() => router.push(`/(membre)/actualite/${item.id}`)}
                  >
                    <View style={styles.newsHeader}>
                      {item.category_label ? (
                        <Text style={styles.newsCat}>{item.category_label}</Text>
                      ) : (
                        <Text style={styles.newsCat}>Actualité</Text>
                      )}
                      <Text style={styles.newsDate}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('fr-FR')
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.newsTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.author ? <Text style={styles.newsAuthor}>Par {item.author}</Text> : null}

                    <View style={styles.newsMedia}>
                      <NewsMediaBlock item={item} compact />
                    </View>

                    {item.media_type && item.media_type !== 'text' && (item.body || item.excerpt) ? (
                      <Text style={styles.newsExcerpt} numberOfLines={3}>
                        {item.body || item.excerpt}
                      </Text>
                    ) : null}

                    <View style={styles.newsFooter}>
                      <Text style={styles.newsCta}>Lire la publication</Text>
                      <Ionicons name="arrow-forward" size={14} color={JP.brand} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
  memberCardWrap: {
    zIndex: 21,
    marginTop: 8,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  list: { gap: 12 },
  activityRail: { gap: 12, paddingRight: 8, paddingBottom: 4 },
  activityCard: {
    width: 260,
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    overflow: 'hidden',
  },
  activityCover: { position: 'relative' },
  activityImage: { width: '100%', height: 120, backgroundColor: JP.brandLight },
  activityDateBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    minWidth: 46,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dateDay: { fontSize: 16, fontWeight: '800', color: JP.brandDark, lineHeight: 18 },
  dateMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'uppercase',
  },
  activityBody: { padding: 12 },
  activityType: {
    fontSize: 11,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  activityTitle: { fontSize: 15, fontWeight: '800', color: JP.text, lineHeight: 20 },
  metaRow: { marginTop: 8, gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMeta: { fontSize: 12, color: JP.muted, fontWeight: '600', flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  activityPill: { alignSelf: 'flex-start', marginTop: 10 },
  pillOk: { backgroundColor: '#ECFDF3' },
  pillBrand: { backgroundColor: JP.brand },
  pillText: { fontSize: 11, fontWeight: '800', color: JP.white },
  pillTextOk: { color: JP.success },
  newsCard: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  newsCat: {
    fontSize: 11,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  newsTitle: { fontSize: 16, fontWeight: '800', color: JP.text, lineHeight: 22 },
  newsAuthor: { marginTop: 4, fontSize: 12, color: JP.muted, fontWeight: '600' },
  newsMedia: { marginTop: 10 },
  newsExcerpt: { marginTop: 10, fontSize: 13, color: JP.muted, lineHeight: 18 },
  newsFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsCta: { fontSize: 12, fontWeight: '800', color: JP.brand },
  newsDate: { fontSize: 11, fontWeight: '700', color: JP.muted },
});
