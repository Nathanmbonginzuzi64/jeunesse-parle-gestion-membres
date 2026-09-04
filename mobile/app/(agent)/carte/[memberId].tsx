import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemberCardBack } from '@/components/membre/member-card-back';
import { MemberCardVisual } from '@/components/membre/member-card-visual';
import type { CardRender } from '@/components/membre/member-card-types';
import { cardFaceSize } from '@/components/membre/member-card-types';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { Badge, BigButton } from '@/components/ui';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { JP } from '@/constants/theme';

export default function AgentCarteApercuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const params = useLocalSearchParams<{ memberId: string }>();
  const memberId = params.memberId ? Number(params.memberId) : null;
  const { width: screenW } = useWindowDimensions();
  const pageWidth = screenW;
  const cardWidth = Math.min(screenW - 40, 420);
  const { height: cardHeight } = cardFaceSize(cardWidth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardRender | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [faceIndex, setFaceIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  const canView = can(PERMISSIONS.cardsView);

  const load = useCallback(async () => {
    if (!memberId || !canView) {
      setLoading(false);
      setError(!canView ? 'Permission cards.view requise.' : 'Membre introuvable.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        data?: { card_number?: string; status_label?: string } | null;
        render?: CardRender | null;
        member?: { full_name?: string; member_code?: string } | null;
      }>(`/members/${memberId}/card`);

      const render = response.render
        ? { ...response.render, photo_url: resolveMediaUrl(response.render.photo_url) }
        : null;
      setCard(render);
      setMemberName(render?.full_name ?? response.member?.full_name ?? '');
    } catch (err) {
      setCard(null);
      setError(err instanceof ApiError ? err.message : 'Impossible de charger la carte.');
    } finally {
      setLoading(false);
    }
  }, [memberId, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  function onCarouselScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = event.nativeEvent.contentOffset.x;
    const next = Math.round(x / pageWidth);
    if (next !== faceIndex) setFaceIndex(Math.max(0, Math.min(1, next)));
  }

  function goToFace(index: 0 | 1) {
    carouselRef.current?.scrollTo({ x: index * pageWidth, animated: true });
    setFaceIndex(index);
  }

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Aperçu carte"
        subtitle={memberName || (loading ? 'Chargement…' : 'Carte membre JP')}
        icon="card-outline"
        showBack
        showNotifications={false}
      />

      {loading ? (
        <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
      ) : error || !card ? (
        <View style={styles.pad}>
          <EmptyState
            title="Carte indisponible"
            subtitle={error ?? 'Aucune carte active pour ce membre.'}
          />
          <View style={{ height: 12 }} />
          <BigButton label="Retour à la galerie" tone="neutral" onPress={() => router.back()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badges}>
            <Badge
              label={card.card_status_label || card.card_status || 'Carte'}
              tone={card.card_status === 'active' ? 'success' : 'neutral'}
            />
            <Badge label={card.status || 'Membre'} tone="success" />
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, faceIndex === 0 && styles.tabActive]}
              onPress={() => goToFace(0)}
            >
              <Text style={[styles.tabText, faceIndex === 0 && styles.tabTextActive]}>Recto</Text>
            </Pressable>
            <Pressable
              style={[styles.tab, faceIndex === 1 && styles.tabActive]}
              onPress={() => goToFace(1)}
            >
              <Text style={[styles.tabText, faceIndex === 1 && styles.tabTextActive]}>Verso</Text>
            </Pressable>
          </View>

          <ScrollView
            ref={carouselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScroll}
            style={{ width: pageWidth }}
          >
            <View style={[styles.facePage, { width: pageWidth, minHeight: cardHeight + 24 }]}>
              <MemberCardVisual render={card} width={cardWidth} />
            </View>
            <View style={[styles.facePage, { width: pageWidth, minHeight: cardHeight + 24 }]}>
              <MemberCardBack render={card} width={cardWidth} />
            </View>
          </ScrollView>

          <Text style={styles.hint}>
            Même design officiel que le portail web — glissez pour voir le verso.
          </Text>

          <View style={{ height: 16 }} />
          <BigButton
            label="Voir la fiche membre"
            onPress={() =>
              router.push({
                pathname: '/(agent)/(tabs)/fiche-membre',
                params: {
                  memberId: String(memberId),
                  memberCode: card.member_code ?? '',
                  fullName: card.full_name ?? '',
                  photoUrl: card.photo_url ?? '',
                  province: card.province ?? '',
                  commune: card.commune ?? '',
                  structure: card.structure ?? '',
                  statusLabel: card.status ?? '',
                  cardStatus: card.card_status_label ?? '',
                },
              })
            }
          />
          <View style={{ height: 10 }} />
          <BigButton
            label="Retour à la galerie"
            tone="neutral"
            onPress={() => router.replace('/(agent)/cartes')}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  pad: { padding: 16 },
  content: { paddingTop: 8 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  tabText: { fontSize: 13, fontWeight: '700', color: JP.muted },
  tabTextActive: { color: JP.brandDark },
  facePage: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: JP.muted,
    paddingHorizontal: 24,
  },
});
