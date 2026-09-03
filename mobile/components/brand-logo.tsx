import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { JP } from '@/constants/theme';

export const LOGO = require('../assets/images/logo.jpeg');

export function BrandLogo({
  size = 72,
  style,
}: {
  size?: number;
  style?: ImageStyle;
}) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      contentFit="cover"
    />
  );
}

export function BrandLockup({ size = 48, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <View style={styles.lockup}>
      <BrandLogo size={size} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.name}>JEUNESSE PARLE</Text>
        {compact ? null : <Text style={styles.sub}>La jeunesse congolaise a une voix</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: JP.brandDark,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    color: JP.muted,
  },
});
