import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Screen } from '@/components/ui';
import { MemberCardBack } from '@/components/membre/member-card-back';
import { MemberCardVisual } from '@/components/membre/member-card-visual';
import type { CardRender } from '@/components/membre/member-card-types';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function MaCarteScreen() {
  const { user, postLoginPath } = useAuth();
  const router = useRouter();
  const { width: screenW } = useWindowDimensions();
  const cardWidth = Math.min(screenW - 32, 420);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardRender | null>(null);

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

  async function shareCard() {
    if (!card) return;
    const lines = [
      card.organization ?? 'Jeunesse Parle',
      card.full_name ?? '',
      card.member_code ?? '',
      card.structure ? `Structure : ${card.structure}` : '',
      card.verification_url ? `Vérification : ${card.verification_url}` : '',
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      Alert.alert('Partage', 'Impossible de partager pour le moment.');
    }
  }

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
            <View style={styles.face}>
              <View style={styles.faceCaption}>
                <Text style={styles.faceLabel}>Recto</Text>
                <Text style={styles.faceCode}>{card.member_code}</Text>
              </View>
              <MemberCardVisual render={card} width={cardWidth} />
            </View>

            <View style={[styles.face, { marginTop: 20 }]}>
              <Text style={styles.faceLabel}>Verso</Text>
              <View style={{ height: 8 }} />
              <MemberCardBack render={card} width={cardWidth} />
            </View>

            <View style={styles.actions}>
              <BigButton label="Partager ma carte" onPress={() => void shareCard()} />
              <View style={{ height: 10 }} />
              <BigButton label="Actualiser" tone="neutral" onPress={() => void load()} />
            </View>
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
  face: { width: '100%', alignItems: 'center' },
  actions: { width: '100%', marginTop: 20 },
  faceCaption: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
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
    color: '#cbd5e1',
    fontVariant: ['tabular-nums'],
  },
  empty: {
    marginTop: 24,
    fontSize: 13,
    color: JP.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: { color: JP.danger, fontWeight: '700', textAlign: 'center' },
});
