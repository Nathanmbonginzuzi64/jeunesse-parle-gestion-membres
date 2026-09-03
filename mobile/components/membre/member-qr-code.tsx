import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import QRCode from 'qrcode';
import { JP } from '@/constants/theme';

/**
 * Affiche un QR scannable.
 * Évite react-native-qrcode-svg (conflit Metro / entities) et les data-URI SVG via Image RN.
 */
export function MemberQrCode({
  value,
  size = 220,
  caption,
  svgDataUri,
}: {
  value?: string | null;
  size?: number;
  caption?: string;
  /** Optionnel : SVG Laravel (data:image/svg+xml;base64,...) */
  svgDataUri?: string | null;
}) {
  const payload = (value ?? '').trim();
  const [xml, setXml] = useState<string | null>(() => decodeSvgDataUri(svgDataUri));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const fromApi = decodeSvgDataUri(svgDataUri);
    if (fromApi) {
      setXml(fromApi);
      setFailed(false);
      return;
    }

    if (!payload) {
      setXml(null);
      return;
    }

    let cancelled = false;
    setFailed(false);
    void QRCode.toString(payload, {
      type: 'svg',
      margin: 1,
      width: size - 24,
      color: { dark: JP.text, light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
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
  }, [payload, size, svgDataUri]);

  if (!payload && !xml) {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <Text style={styles.empty}>QR indisponible</Text>
        <Text style={styles.hint}>Carte ou jeton manquant</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.box, styles.qrPad, { width: size, minHeight: size }]}>
        {xml ? (
          <SvgXml xml={xml} width={size - 24} height={size - 24} />
        ) : failed ? (
          <Text style={styles.empty}>QR illisible</Text>
        ) : (
          <ActivityIndicator color={JP.brand} />
        )}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

function decodeSvgDataUri(dataUri?: string | null): string | null {
  if (!dataUri) return null;
  const base64 = dataUri.match(/^data:image\/svg\+xml;base64,(.+)$/i);
  if (base64?.[1]) {
    try {
      // atob disponible sous Hermes / Expo
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
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
  },
  qrPad: { padding: 12 },
  empty: { fontSize: 13, fontWeight: '800', color: JP.muted, textAlign: 'center' },
  hint: { marginTop: 4, fontSize: 11, color: JP.muted, textAlign: 'center' },
  caption: { marginTop: 10, fontSize: 12, fontWeight: '800', color: JP.brand },
});
