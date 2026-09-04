import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MembrePageHeader } from '@/components/membre/page-header';
import { SectionHeader } from '@/components/membre/section';
import { MemberCardVisual } from '@/components/membre/member-card-visual';
import type { CardRender } from '@/components/membre/member-card-types';
import { Badge, BigButton } from '@/components/ui';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { JP } from '@/constants/theme';

type MemberDetail = {
  id: number;
  member_code: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  gender_label?: string | null;
  age?: number | null;
  photo_url?: string | null;
  status?: string;
  status_label?: string;
  phone?: string | null;
  email?: string | null;
  profession?: string | null;
  position?: string | null;
  province?: { name: string } | null;
  city?: { name: string } | null;
  commune?: { name: string } | null;
  structure?: { name: string; code?: string } | null;
  fingerprint_enrolled?: boolean;
  fingerprints_count?: number;
  card?: {
    card_number?: string;
    status_label?: string;
    issued_at?: string | null;
    expires_at?: string | null;
  } | null;
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={JP.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value?.trim() || '—'}</Text>
      </View>
    </View>
  );
}

export default function FicheMembreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { can } = useAuth();
  const canViewCards = can(PERMISSIONS.cardsView);
  const params = useLocalSearchParams<{
    memberId: string;
    memberCode: string;
    fullName: string;
    statusLabel?: string;
    province?: string;
    commune?: string;
    structure?: string;
    photoUrl?: string;
    verified?: string;
    cardStatus?: string;
  }>();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [cardRender, setCardRender] = useState<CardRender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardWidth = Math.min(screenW - 48, 420);

  const load = useCallback(async () => {
    const id = params.memberId ? Number(params.memberId) : null;
    if (!id) {
      setLoading(false);
      setError('Membre introuvable.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data?: MemberDetail } | MemberDetail>(`/members/${id}`);
      const payload =
        response && typeof response === 'object' && 'data' in response && response.data
          ? response.data
          : (response as MemberDetail);
      setMember(payload);

      if (canViewCards) {
        try {
          const cardRes = await api.get<{ render?: CardRender | null }>(`/members/${id}/card`);
          setCardRender(
            cardRes.render
              ? { ...cardRes.render, photo_url: resolveMediaUrl(cardRes.render.photo_url) }
              : null,
          );
        } catch {
          setCardRender(null);
        }
      } else {
        setCardRender(null);
      }
    } catch (err) {
      setMember(null);
      setError(err instanceof ApiError ? err.message : 'Impossible de charger la fiche.');
    } finally {
      setLoading(false);
    }
  }, [params.memberId, canViewCards]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = member?.full_name ?? params.fullName ?? 'Membre';
  const code = member?.member_code ?? params.memberCode ?? '—';
  const photo =
    resolveMediaUrl(member?.photo_url ?? params.photoUrl) ??
    resolveMediaUrl(cardRender?.photo_url) ??
    null;
  const statusLabel = member?.status_label ?? params.statusLabel ?? 'Membre';
  const cardStatus = member?.card?.status_label ?? params.cardStatus;

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Fiche membre"
        subtitle={params.verified === '1' ? 'Identité confirmée' : 'Détail du membre'}
        icon="person-outline"
        showBack
        showNotifications={false}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 32 }} />
        ) : (
          <>
            <View style={styles.heroCard}>
              <AuthenticatedImage
                uri={photo}
                memberCode={code !== '—' ? code : null}
                style={styles.photo}
                fallbackLetter={name}
              />
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.code}>{code}</Text>
              <View style={styles.badges}>
                <Badge label={statusLabel} tone="success" />
                {cardStatus ? <Badge label={cardStatus} tone="success" /> : null}
                {params.verified === '1' ? <Badge label="Identité OK" tone="success" /> : null}
                {member?.fingerprint_enrolled ? (
                  <Badge label="Empreinte" tone="success" />
                ) : null}
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {cardRender ? (
              <>
                <SectionHeader title="Carte officielle" />
                <View style={styles.cardStage}>
                  <MemberCardVisual render={cardRender} width={cardWidth} />
                </View>
                <Pressable
                  style={styles.cardLink}
                  onPress={() =>
                    router.push({
                      pathname: '/(agent)/carte/[memberId]',
                      params: { memberId: String(params.memberId) },
                    })
                  }
                >
                  <Ionicons name="card-outline" size={16} color={JP.brand} />
                  <Text style={styles.cardLinkText}>Voir recto / verso complet</Text>
                  <Ionicons name="chevron-forward" size={16} color={JP.brand} />
                </Pressable>
              </>
            ) : null}

            <SectionHeader title="Identité" />
            <View style={styles.card}>
              <InfoRow
                icon="person-outline"
                label="Nom complet"
                value={name}
              />
              <InfoRow icon="barcode-outline" label="Code membre" value={code} />
              <InfoRow
                icon="male-female-outline"
                label="Genre"
                value={member?.gender_label}
              />
              <InfoRow
                icon="calendar-outline"
                label="Âge"
                value={member?.age != null ? `${member.age} ans` : null}
              />
              <InfoRow
                icon="briefcase-outline"
                label="Profession"
                value={member?.profession}
              />
              <InfoRow
                icon="ribbon-outline"
                label="Fonction"
                value={member?.position}
              />
            </View>

            <SectionHeader title="Localisation" />
            <View style={styles.card}>
              <InfoRow
                icon="map-outline"
                label="Province"
                value={member?.province?.name ?? params.province}
              />
              <InfoRow
                icon="business-outline"
                label="Ville"
                value={member?.city?.name}
              />
              <InfoRow
                icon="navigate-outline"
                label="Commune"
                value={member?.commune?.name ?? params.commune}
              />
              <InfoRow
                icon="home-outline"
                label="Structure"
                value={
                  member?.structure?.name ??
                  params.structure ??
                  null
                }
              />
            </View>

            {(member?.phone || member?.email || member?.card) && (
              <>
                <SectionHeader title="Coordonnées & carte" />
                <View style={styles.card}>
                  {member?.phone ? (
                    <InfoRow icon="call-outline" label="Téléphone" value={member.phone} />
                  ) : null}
                  {member?.email ? (
                    <InfoRow icon="mail-outline" label="E-mail" value={member.email} />
                  ) : null}
                  {member?.card?.card_number ? (
                    <InfoRow
                      icon="card-outline"
                      label="N° carte"
                      value={member.card.card_number}
                    />
                  ) : null}
                  {member?.card?.expires_at ? (
                    <InfoRow
                      icon="time-outline"
                      label="Expiration"
                      value={new Date(member.card.expires_at).toLocaleDateString('fr-FR')}
                    />
                  ) : null}
                  <InfoRow
                    icon="finger-print-outline"
                    label="Empreintes"
                    value={
                      member?.fingerprint_enrolled
                        ? `${member.fingerprints_count ?? 1} enregistrée(s)`
                        : 'Non enregistrée'
                    }
                  />
                </View>
              </>
            )}

            <View style={{ height: 8 }} />
            <BigButton
              label="Nouvelle vérification"
              onPress={() =>
                router.replace({
                  pathname: '/(agent)/(tabs)/verifier',
                  params: { mode: 'identity', fresh: '1' },
                })
              }
            />
            <View style={{ height: 10 }} />
            <BigButton label="Retour" tone="neutral" onPress={() => router.back()} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: JP.bg },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  heroCard: {
    backgroundColor: JP.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardStage: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: JP.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardLinkText: { flex: 1, fontSize: 13, fontWeight: '700', color: JP.brand },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 32,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: JP.brandLight,
    overflow: 'hidden',
  },
  name: { fontSize: 22, fontWeight: '900', color: JP.text, textAlign: 'center' },
  code: {
    marginTop: 4,
    fontFamily: 'monospace',
    color: JP.muted,
    fontWeight: '700',
    fontSize: 14,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: JP.border,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: JP.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: JP.text,
  },
  error: {
    color: JP.danger,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
});
