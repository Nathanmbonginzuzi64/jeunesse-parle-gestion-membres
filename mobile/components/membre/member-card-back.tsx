import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandLogo } from '@/components/brand-logo';
import { MemberQrCode } from '@/components/membre/member-qr-code';
import { FlagStripe } from '@/components/membre/flag-stripe';
import {
  CARD,
  cardFaceSize,
  formatCardDate,
  type CardRender,
} from '@/components/membre/member-card-types';

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value?.trim() || '—'}
      </Text>
    </View>
  );
}

/** Verso — QR et cachet bien visibles. */
export function MemberCardBack({
  render,
  width: widthProp,
}: {
  render: CardRender;
  width?: number;
}) {
  const { width: screenW } = useWindowDimensions();
  const { width, height } = cardFaceSize(widthProp ?? Math.min(screenW - 32, 520));
  const structure =
    [render.province, render.commune ?? render.city, render.structure].filter(Boolean).join(' / ') ||
    null;
  const qrValue = render.verification_url || render.member_code;
  const qrSize = width < 360 ? 40 : 48;

  return (
    <View style={[styles.card, { width, height }]}>
      <LinearGradient
        colors={[CARD.brand950, CARD.brand900, CARD.brand800]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.header}
      >
        <BrandLogo size={20} style={styles.logoRing} />
        <Text style={styles.org} numberOfLines={1}>
          {render.organization ?? 'Jeunesse Parle'} — RDC
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.title}>Carte de membre</Text>
          <Text style={styles.blurb} numberOfLines={1}>
            Validité vérifiable via QR · En cas de perte, contactez votre structure.
          </Text>

          <View style={styles.metaBox}>
            <MetaRow label="ID" value={render.member_code} />
            <MetaRow label="Émission" value={formatCardDate(render.issued_at)} />
            <MetaRow label="Expiration" value={formatCardDate(render.expires_at)} />
            <MetaRow label="Statut" value={render.card_status_label || render.status} />
            <MetaRow label="Structure" value={structure} />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.signature}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Signature du titulaire</Text>
          </View>

          <View style={styles.sealBlock}>
            <View style={styles.seal}>
              <Text style={styles.sealText}>
                Cachet{'\n'}officiel
              </Text>
            </View>
            <Text style={styles.sealCaption}>Cachet</Text>
          </View>

          <View style={styles.qrBlock}>
            <View style={styles.qrBox}>
              <MemberQrCode
                value={qrValue}
                svgDataUri={render.qr_svg}
                size={qrSize}
                compact
              />
            </View>
            <Text style={styles.qrCaption}>QR vérification</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.contact}>www.jeunesseparle.cd · contact@jeunesseparle.cd</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoRing: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  org: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: CARD.white,
    textTransform: 'uppercase',
  },
  body: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
    minHeight: 0,
  },
  top: { minHeight: 0, flexShrink: 1 },
  title: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: CARD.brand800,
    textTransform: 'uppercase',
  },
  blurb: {
    marginTop: 2,
    fontSize: 6,
    lineHeight: 8,
    color: CARD.slate500,
  },
  metaBox: {
    marginTop: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CARD.slate100,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(241, 245, 249, 0.9)',
    paddingVertical: 2,
  },
  metaLabel: {
    width: 64,
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: CARD.slate400,
    textTransform: 'uppercase',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 8,
    fontWeight: '700',
    color: CARD.brand950,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    flexShrink: 0,
  },
  signature: {
    flex: 1,
    minWidth: 0,
    paddingBottom: 2,
  },
  signLine: {
    height: 1,
    maxWidth: 100,
    backgroundColor: CARD.slate300,
    marginBottom: 3,
  },
  signLabel: {
    fontSize: 6,
    letterSpacing: 0.3,
    color: CARD.slate400,
    textTransform: 'uppercase',
  },
  sealBlock: {
    alignItems: 'center',
    gap: 2,
  },
  seal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: CARD.brand800,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD.brand50,
  },
  sealText: {
    fontSize: 4.5,
    fontWeight: '800',
    lineHeight: 5.5,
    textAlign: 'center',
    letterSpacing: 0.1,
    color: CARD.brand800,
    textTransform: 'uppercase',
  },
  sealCaption: {
    fontSize: 5,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: CARD.slate500,
    textTransform: 'uppercase',
  },
  qrBlock: {
    alignItems: 'center',
    gap: 2,
  },
  qrBox: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: CARD.slate200,
    backgroundColor: CARD.white,
    padding: 2,
  },
  qrCaption: {
    fontSize: 5,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: CARD.slate500,
    textTransform: 'uppercase',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CARD.slate100,
    backgroundColor: 'rgba(248, 250, 252, 0.7)',
    flexShrink: 0,
  },
  contact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: CARD.brand800,
  },
});
