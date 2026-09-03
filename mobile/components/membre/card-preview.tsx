import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/brand-logo';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { JP } from '@/constants/theme';

export type CardPreviewData = {
  full_name?: string;
  member_code?: string;
  photo_url?: string | null;
  expires_at?: string | null;
  issued_at?: string | null;
  card_status_label?: string | null;
  structure?: string | null;
  organization?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}

export function MemberCardPreview({
  card,
  fallbackPhotoUrl,
  onPress,
}: {
  card: CardPreviewData;
  authHeader?: Record<string, string>;
  fallbackPhotoUrl?: string | null;
  onPress?: () => void;
}) {
  const expires = formatDate(card.expires_at);
  const issued = formatDate(card.issued_at);
  const photoUri = card.photo_url || fallbackPhotoUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={styles.accent} />

      <View style={styles.main}>
        <AuthenticatedImage
          uri={photoUri}
          memberCode={card.member_code}
          fallbackLetter={card.full_name}
          style={styles.photo}
        />

        <View style={styles.info}>
          <View style={styles.brandRow}>
            <BrandLogo size={22} />
            <Text style={styles.org} numberOfLines={1}>
              {card.organization ?? 'Jeunesse Parle'}
            </Text>
          </View>

          <Text style={styles.code} numberOfLines={1}>
            {card.member_code ?? '—'}
          </Text>
          <Text style={styles.name} numberOfLines={2}>
            {(card.full_name ?? '—').toUpperCase()}
          </Text>

          {card.structure ? (
            <Text style={styles.meta} numberOfLines={1}>
              {card.structure}
            </Text>
          ) : null}

          {issued ? (
            <Text style={styles.issued} numberOfLines={1}>
              Adhésion · {issued}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>
            {(card.card_status_label ?? 'CARTE VALIDE').toUpperCase()}
          </Text>
        </View>

        <View style={styles.footerRight}>
          {expires ? <Text style={styles.expire}>Exp. {expires}</Text> : null}
          <View style={styles.openRow}>
            <Text style={styles.open}>Voir</Text>
            <Ionicons name="chevron-forward" size={13} color={JP.brand} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
    overflow: 'hidden',
    shadowColor: '#0B1F33',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  pressed: { opacity: 0.97, transform: [{ scale: 0.992 }] },
  accent: { height: 3, backgroundColor: JP.brand },
  main: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
  },
  photo: {
    width: 78,
    height: 96,
    borderRadius: 14,
    backgroundColor: JP.brandLight,
    borderWidth: 2,
    borderColor: '#D6EAF8',
  },
  info: { flex: 1, minWidth: 0, justifyContent: 'center' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  org: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: JP.brand,
    letterSpacing: 0.2,
  },
  code: {
    color: JP.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  name: {
    marginTop: 2,
    color: JP.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  meta: {
    marginTop: 4,
    color: JP.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  issued: {
    marginTop: 4,
    color: JP.brandDark,
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#F7FBFE',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: JP.success },
  badgeText: {
    color: JP.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  expire: {
    color: JP.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  open: { fontSize: 12, fontWeight: '800', color: JP.brand },
});
