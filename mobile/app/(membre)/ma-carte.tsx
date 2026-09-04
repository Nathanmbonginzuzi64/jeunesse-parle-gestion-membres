import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { BigButton, Screen } from '@/components/ui';
import { MemberCardBack } from '@/components/membre/member-card-back';
import { MemberCardVisual } from '@/components/membre/member-card-visual';
import type { CardRender } from '@/components/membre/member-card-types';
import { cardFaceSize } from '@/components/membre/member-card-types';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import {
  captureCardFace,
  FACE_LABEL,
  saveCardImageToGallery,
  shareCardImage,
  type CardFace,
} from '@/lib/card-export';
import { JP } from '@/constants/theme';

export default function MaCarteScreen() {
  const { user, postLoginPath } = useAuth();
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const pageWidth = screenW;
  const cardWidth = Math.min(screenW - 40, 420);
  const { height: cardHeight } = cardFaceSize(cardWidth);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardRender | null>(null);
  const [faceIndex, setFaceIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const carouselRef = useRef<ScrollView>(null);
  const rectoRef = useRef(null);
  const versoRef = useRef(null);

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

  const load = useCallback(async () => {
    if (!user?.member_id || user.needs_profile_completion) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{
        data?: { card_number?: string } | null;
        render?: CardRender | null;
      }>(`/members/${user.member_id}/card`);
      setCard(
        response.render
          ? { ...response.render, photo_url: resolveMediaUrl(response.render.photo_url) }
          : null,
      );
    } catch (err) {
      setCard(null);
      setError(err instanceof ApiError ? err.message : 'Impossible de charger votre carte.');
    } finally {
      setLoading(false);
    }
  }, [user?.member_id, user?.needs_profile_completion]);

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

  async function withFaceUri(face: CardFace, action: (uri: string) => Promise<void>) {
    const ref = face === 'recto' ? rectoRef : versoRef;
    setBusy(true);
    try {
      // Laisser le layout se stabiliser avant capture
      await new Promise((r) => setTimeout(r, 80));
      const uri = await captureCardFace(ref, face, card?.member_code);
      await action(uri);
    } catch (err) {
      Alert.alert(
        'Carte',
        err instanceof Error ? err.message : 'Action impossible pour le moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  function onDownload() {
    Alert.alert('Télécharger', 'Quelle face enregistrer en image PNG ?', [
      {
        text: 'Recto',
        onPress: () => void withFaceUri('recto', (uri) => saveCardImageToGallery(uri, 'recto')),
      },
      {
        text: 'Verso',
        onPress: () => void withFaceUri('verso', (uri) => saveCardImageToGallery(uri, 'verso')),
      },
      {
        text: 'Les deux',
        onPress: () =>
          void (async () => {
            await withFaceUri('recto', (uri) => saveCardImageToGallery(uri, 'recto'));
            await withFaceUri('verso', (uri) => saveCardImageToGallery(uri, 'verso'));
          })(),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function onShare() {
    Alert.alert('Partager', 'Partager l’image de la carte (qualité maximale)', [
      {
        text: 'Recto',
        onPress: () =>
          void withFaceUri('recto', (uri) => shareCardImage(uri, 'recto', card?.member_code)),
      },
      {
        text: 'Verso',
        onPress: () =>
          void withFaceUri('verso', (uri) => shareCardImage(uri, 'verso', card?.member_code)),
      },
      {
        text: 'Face visible',
        onPress: () => {
          const face: CardFace = faceIndex === 0 ? 'recto' : 'verso';
          void withFaceUri(face, (uri) => shareCardImage(uri, face, card?.member_code));
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  const currentFace: CardFace = faceIndex === 0 ? 'recto' : 'verso';

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Ma carte"
        subtitle={card?.full_name ?? user?.name ?? 'Carte membre'}
        icon="card-outline"
        showBack
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={styles.body}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={JP.brand} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <View style={{ height: 12 }} />
            <BigButton label="Réessayer" onPress={() => void load()} />
          </View>
        ) : card ? (
          <>
            <View style={styles.carouselMeta}>
              <Text style={styles.faceLabel}>{FACE_LABEL[currentFace]}</Text>
              <Text style={styles.faceCode}>{card.member_code}</Text>
            </View>

            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={onCarouselScroll}
              style={{ width: pageWidth, marginHorizontal: -16 }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              <View style={[styles.slide, { width: pageWidth }]}>
                <ViewShot
                  ref={rectoRef}
                  options={{ format: 'png', quality: 1 }}
                  style={styles.shot}
                  collapsable={false}
                >
                  <MemberCardVisual render={card} width={cardWidth} />
                </ViewShot>
              </View>
              <View style={[styles.slide, { width: pageWidth }]}>
                <ViewShot
                  ref={versoRef}
                  options={{ format: 'png', quality: 1 }}
                  style={styles.shot}
                  collapsable={false}
                >
                  <MemberCardBack render={card} width={cardWidth} />
                </ViewShot>
              </View>
            </ScrollView>

            <View style={styles.dots}>
              <Pressable
                onPress={() => goToFace(0)}
                style={[styles.dot, faceIndex === 0 && styles.dotOn]}
                accessibilityLabel="Voir le recto"
              />
              <Pressable
                onPress={() => goToFace(1)}
                style={[styles.dot, faceIndex === 1 && styles.dotOn]}
                accessibilityLabel="Voir le verso"
              />
            </View>
            <Text style={styles.hint}>Glissez pour basculer recto / verso</Text>

            <View style={[styles.actions, { marginTop: 16 }]}>
              <BigButton
                label={busy ? 'Préparation…' : 'Partager l’image'}
                onPress={onShare}
                disabled={busy}
              />
              <View style={{ height: 10 }} />
              <BigButton
                label="Télécharger (PNG)"
                tone="neutral"
                onPress={onDownload}
                disabled={busy}
              />
              <View style={{ height: 10 }} />
              <Pressable
                onPress={() => void load()}
                style={styles.refreshRow}
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={16} color={JP.brand} />
                <Text style={styles.refreshText}>Actualiser</Text>
              </Pressable>
            </View>

            {/* Hauteur réservée pour éviter le saut de layout */}
            <View style={{ height: Math.max(0, 8) }} />
            <Text style={styles.ghost}>{cardHeight ? '' : ''}</Text>
          </>
        ) : (
          <Text style={styles.empty}>Aucune carte active pour le moment.</Text>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40, alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  carouselMeta: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  slide: { alignItems: 'center', justifyContent: 'center' },
  shot: { backgroundColor: 'transparent' },
  actions: { width: '100%' },
  faceLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: JP.muted,
    textTransform: 'uppercase',
  },
  faceCode: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JP.border,
  },
  dotOn: {
    width: 22,
    backgroundColor: JP.brand,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: JP.muted,
    fontWeight: '600',
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshText: { fontSize: 13, fontWeight: '700', color: JP.brand },
  empty: {
    marginTop: 24,
    fontSize: 13,
    color: JP.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: { color: JP.danger, fontWeight: '700', textAlign: 'center' },
  ghost: { height: 0, opacity: 0 },
});
