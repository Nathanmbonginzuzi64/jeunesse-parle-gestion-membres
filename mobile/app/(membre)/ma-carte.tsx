import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Screen } from '@/components/ui';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MemberQrCode } from '@/components/membre/member-qr-code';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { JP } from '@/constants/theme';

type CardRender = {
  organization?: string;
  member_code?: string;
  full_name?: string;
  photo_url?: string | null;
  structure?: string | null;
  province?: string | null;
  city?: string | null;
  commune?: string | null;
  position?: string | null;
  status?: string;
  card_status_label?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  verification_url?: string | null;
  qr_svg?: string | null;
};

export default function MaCarteScreen() {
  const { user, postLoginPath } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<CardRender | null>(null);
  const [cardNumber, setCardNumber] = useState<string | null>(null);

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
      setCardNumber(response.data?.card_number ?? null);
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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.org}>{card.organization ?? 'Jeunesse Parle'}</Text>
              <Text style={styles.badge}>{card.card_status_label ?? 'Active'}</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.photoWrap}>
                <AuthenticatedImage
                  uri={card.photo_url}
                  memberCode={card.member_code}
                  fallbackLetter={card.full_name}
                  style={styles.photo}
                />
              </View>
              <MemberQrCode
                value={card.verification_url || card.member_code}
                svgDataUri={card.qr_svg}
                size={112}
              />
            </View>

            <Text style={styles.name}>{card.full_name}</Text>
            <Text style={styles.code}>{card.member_code}</Text>
            {cardNumber ? <Text style={styles.meta}>N° carte {cardNumber}</Text> : null}

            <View style={styles.divider} />
            <Info label="Statut" value={card.status} />
            <Info label="Province" value={card.province} />
            <Info label="Commune" value={card.commune} />
            <Info label="Structure" value={card.structure} />
            <Info label="Fonction" value={card.position} />
            <Info label="Émise le" value={card.issued_at} />
            <Info label="Expire le" value={card.expires_at} />
          </View>

          <View style={{ height: 16 }} />
          <BigButton label="Partager ma carte" onPress={() => void shareCard()} />
          <View style={{ height: 10 }} />
          <BigButton label="Actualiser" tone="neutral" onPress={() => void load()} />
        </>
      ) : (
        <Text style={styles.meta}>Aucune carte active pour le moment.</Text>
      )}
    </Screen>
    </View>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 40 },
  center: { alignItems: 'center', paddingVertical: 40 },
  card: {
    borderRadius: 18,
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  org: { fontSize: 13, fontWeight: '800', color: JP.brand },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: JP.success,
    backgroundColor: '#E8F8EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 12 },
  photoWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: JP.brandLight,
  },
  photo: { width: 96, height: 120, backgroundColor: JP.brandLight },
  qr: { width: 120, height: 120, backgroundColor: JP.white },
  qrEmpty: {
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  qrHint: { fontSize: 12, fontWeight: '700', color: JP.muted },
  codeSmall: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: JP.brand,
    textAlign: 'center',
  },
  name: { fontSize: 20, fontWeight: '800', color: JP.text },
  code: { marginTop: 4, fontSize: 14, fontWeight: '700', color: JP.brand },
  meta: { marginTop: 4, fontSize: 12, color: JP.muted, fontWeight: '600' },
  divider: { height: 1, backgroundColor: JP.border, marginVertical: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  infoLabel: { fontSize: 12, color: JP.muted, fontWeight: '600' },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 13, color: JP.text, fontWeight: '700' },
  error: { color: JP.danger, fontWeight: '700', textAlign: 'center' },
});
