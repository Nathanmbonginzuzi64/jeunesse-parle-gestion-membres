import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import QRCode from 'qrcode';
import { JP } from '@/constants/theme';

/**
 * Affiche un QR scannable (contraste noir/blanc + quiet zone).
 * Évite react-native-qrcode-svg (conflit Metro / entities) et les data-URI SVG via Image RN.
 */
export function MemberQrCode({
  value,
  size = 240,
  caption,
  svgDataUri,
  compact = false,
  emphasize = false,
}: {
  value?: string | null;
  size?: number;
  caption?: string;
  /** Optionnel : SVG Laravel (data:image/svg+xml;base64,...) */
  svgDataUri?: string | null;
  /** Moins de padding / bordure — pour intégration dans la carte. */
  compact?: boolean;
  /** Cadre généreux pour scan agent (écran Ma carte). */
  emphasize?: boolean;
}) {
  const payload = (value ?? '').trim();
  const pad = emphasize ? 14 : compact ? 4 : 12;
  const inner = Math.max(size - pad * 2, 12);
  const [xml, setXml] = useState<string | null>(() => decodeSvgDataUri(svgDataUri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Sur la carte ou en mode scan, on privilégie un rendu client haute qualité
    // (EC H + marge) plutôt qu'un SVG serveur parfois trop dense pour la taille affichée.
    if (svgDataUri && !emphasize && !compact) {
      const fromApi = decodeSvgDataUri(svgDataUri);
      if (fromApi) {
        setXml(fromApi);
        setFailed(false);
        return;
      }
    }

    if (!payload) {
      setXml(null);
      return;
    }

    let cancelled = false;
    setFailed(false);
    void QRCode.toString(payload, {
      type: 'svg',
      margin: emphasize ? 3 : compact ? 2 : 3,
      width: Math.max(inner, emphasize ? 280 : 160),
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })
      .then((svg) => {
        if (!cancelled) setXml(svg);
      })
      .catch(() => {
        if (!cancelled) {
          setXml(null);
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload, inner, svgDataUri, compact, emphasize]);

  if (!payload && !xml) {
    return (
      <View style={[styles.box, compact && styles.boxCompact, { width: size, height: size }]}>
        {!compact ? (
          <>
            <Text style={styles.empty}>QR indisponible</Text>
            <Text style={styles.hint}>Carte ou jeton manquant</Text>
          </>
        ) : (
          <Text style={styles.emptyCompact}>—</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.box,
          compact ? styles.boxCompact : styles.qrPad,
          emphasize && styles.boxEmphasize,
          { width: size, minHeight: size, padding: pad },
        ]}
      >
        {xml ? (
          <SvgXml xml={xml} width={inner} height={inner} />
        ) : failed ? (
          <Text style={compact ? styles.emptyCompact : styles.empty}>QR illisible</Text>
        ) : (
          <ActivityIndicator color={JP.brand} size={compact ? 'small' : 'large'} />
        )}
      </View>
      {caption ? <Text style={[styles.caption, emphasize && styles.captionEmphasize]}>{caption}</Text> : null}
    </View>
  );
}

function decodeSvgDataUri(dataUri?: string | null): string | null {
  if (!dataUri) return null;
  const base64 = dataUri.match(/^data:image\/svg\+xml;base64,(.+)$/i);
  if (base64?.[1]) {
    try {
      return globalThis.atob(base64[1]);
    } catch {
      return null;
    }
  }
  const utf8 = dataUri.match(/^data:image\/svg\+xml(?:;charset=utf-8)?,(.+)$/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  if (dataUri.trimStart().startsWith('<svg')) return dataUri;
  return null;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
  },
  boxCompact: {
    borderRadius: 8,
    borderWidth: 0,
  },
  boxEmphasize: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: JP.brand,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  qrPad: { padding: 12 },
  empty: { fontSize: 13, fontWeight: '800', color: JP.muted, textAlign: 'center' },
  emptyCompact: { fontSize: 9, fontWeight: '700', color: JP.muted },
  hint: { marginTop: 4, fontSize: 11, color: JP.muted, textAlign: 'center' },
  caption: { marginTop: 10, fontSize: 12, fontWeight: '800', color: JP.brand },
  captionEmphasize: { fontSize: 14, marginTop: 12 },
});
