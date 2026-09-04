import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BrandLogo } from '@/components/brand-logo';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MemberQrCode } from '@/components/membre/member-qr-code';
import { FlagStripe } from '@/components/membre/flag-stripe';
import {
  CARD,
  cardFaceSize,
  formatCardDate,
  isActiveStatus,
  isCertifiedCard,
  structureLine,
  validityLine,
  type CardRender,
} from '@/components/membre/member-card-types';

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, mono && styles.fieldMono]} numberOfLines={1}>
        {value?.trim() || '—'}
      </Text>
    </View>
  );
}

/** Recto — même disposition que `MemberCardVisual` (web). */
export function MemberCardVisual({
  render,
  width: widthProp,
}: {
  render: CardRender;
  width?: number;
}) {
  const { width: screenW } = useWindowDimensions();
  const { width, height } = cardFaceSize(widthProp ?? Math.min(screenW - 32, 520));
  const compact = width < 360;
  const active = isActiveStatus(render.status);
  const certified = isCertifiedCard(render);
  const qrValue = render.verification_url || render.member_code;
  const qrSize = compact ? 84 : 100;
  const initials =
    `${(render.first_name?.[0] ?? '').toUpperCase()}${(render.last_name?.[0] ?? '').toUpperCase()}` ||
    (render.full_name?.[0] ?? '?').toUpperCase();

  return (
    <View style={[styles.card, { width, height }]}>
      <View style={styles.watermark} pointerEvents="none">
        <BrandLogo size={compact ? 90 : 120} style={{ opacity: 0.045 }} />
      </View>

      <LinearGradient
        colors={[CARD.brand950, CARD.brand900, CARD.brand800]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <BrandLogo size={compact ? 26 : 30} style={styles.logoRing} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.org} numberOfLines={1}>
              {render.organization ?? 'Jeunesse Parle'}
            </Text>
            <Text style={styles.orgSub} numberOfLines={1}>
              Plateforme nationale de jeunesse
            </Text>
          </View>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Carte de membre</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.photoWrap, compact && styles.photoWrapCompact]}>
          {render.photo_url ? (
            <AuthenticatedImage
              uri={render.photo_url}
              memberCode={render.member_code}
              fallbackLetter={render.full_name}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.initials}>{initials}</Text>
              <Text style={styles.photoHint}>Photo</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.fullName} numberOfLines={1}>
              {render.full_name}
            </Text>
            {certified ? (
              <View style={styles.certified}>
                <Ionicons name="checkmark-circle" size={9} color={CARD.white} />
                <Text style={styles.certifiedText}>Certifié</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.grid2}>
            <Field label="Nom" value={render.last_name} />
            <Field label="Postnom" value={render.middle_name} />
            <Field label="Prénom" value={render.first_name} />
            <Field label="ID membre" value={render.member_code} mono />
          </View>

          <View style={styles.gridDivider}>
            <Field label="Province" value={render.province} />
            <Field label="Structure" value={structureLine(render)} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Statut</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: active ? '#10b981' : '#f59e0b' },
                  ]}
                />
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {render.status ?? '—'}
                </Text>
              </View>
            </View>
            <Field label="Validité" value={validityLine(render)} mono />
          </View>
        </View>

        <View style={styles.qrBox}>
          <MemberQrCode
            value={qrValue}
            svgDataUri={render.qr_svg}
            size={qrSize}
            compact
          />
          <Text style={styles.qrCaption}>Vérification</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerDates}>
          <Text style={styles.footerDate}>
            Émise le <Text style={styles.footerDateStrong}>{formatCardDate(render.issued_at)}</Text>
          </Text>
          <Text style={styles.footerDate}>
            Expire le <Text style={styles.footerDateStrong}>{formatCardDate(render.expires_at)}</Text>
          </Text>
        </View>
        <FlagStripe height={5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD.border,
    backgroundColor: CARD.white,
    overflow: 'hidden',
    shadowColor: '#102840',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  watermark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  logoRing: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  org: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: CARD.white,
    textTransform: 'uppercase',
  },
  orgSub: {
    marginTop: 1,
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
  },
  pill: {
    backgroundColor: CARD.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: CARD.brand900,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1,
    minHeight: 0,
  },
  qrBox: {
    alignSelf: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CARD.brand600,
    backgroundColor: CARD.white,
    padding: 6,
  },
  qrCaption: {
    marginTop: 3,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: CARD.brand700,
    textTransform: 'uppercase',
  },
  photoWrap: {
    width: 56,
    alignSelf: 'center',
    aspectRatio: 0.82,
    maxHeight: 70,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD.slate200,
    backgroundColor: CARD.slate100,
  },
  photoWrapCompact: { width: 46, maxHeight: 58 },
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD.slate100,
  },
  initials: {
    fontSize: 12,
    fontWeight: '800',
    color: CARD.slate400,
    letterSpacing: 1,
  },
  photoHint: {
    marginTop: 1,
    fontSize: 6,
    fontWeight: '600',
    color: CARD.slate400,
    textTransform: 'uppercase',
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullName: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: CARD.brand950,
    textTransform: 'uppercase',
  },
  certified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: CARD.brand600,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  certifiedText: {
    fontSize: 6,
    fontWeight: '800',
    color: CARD.white,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 3,
    columnGap: 8,
  },
  gridDivider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 3,
    columnGap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD.slate100,
    paddingTop: 3,
  },
  field: {
    width: '46%',
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: CARD.slate400,
    textTransform: 'uppercase',
  },
  fieldValue: {
    marginTop: 0,
    fontSize: 8,
    fontWeight: '800',
    color: CARD.brand950,
    textTransform: 'uppercase',
    letterSpacing: 0.15,
  },
  fieldMono: {
    fontSize: 7.5,
    letterSpacing: -0.2,
    textTransform: 'none',
  },
  statusRow: {
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD.slate100,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 1,
    flexShrink: 0,
  },
  footerDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 5,
    paddingBottom: 4,
  },
  footerDate: {
    fontSize: 10,
    fontWeight: '600',
    color: CARD.slate500,
  },
  footerDateStrong: {
    color: CARD.slate700,
    fontWeight: '800',
    fontSize: 10,
  },
});
