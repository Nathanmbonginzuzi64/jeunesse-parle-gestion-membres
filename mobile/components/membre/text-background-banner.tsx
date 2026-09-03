import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getTextBackground,
  resolveTextBackgroundId,
  type TextBackgroundId,
} from '@/lib/text-backgrounds';

type Props = {
  backgroundId?: string | Record<string, unknown> | null;
  title?: string | null;
  body?: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function TextBackgroundBanner({
  backgroundId,
  title,
  body,
  compact = false,
  style,
}: Props) {
  const id = resolveTextBackgroundId(backgroundId);
  if (!id || id === 'none') return null;

  const bg = getTextBackground(id as TextBackgroundId);
  const displayBody = body?.trim() || '';
  const displayTitle = title?.trim() || '';
  const text =
    compact && displayBody.length > 200
      ? `${displayBody.slice(0, 200)}…`
      : displayBody || displayTitle || '';

  if (!text) return null;

  return (
    <LinearGradient
      colors={bg.colors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.banner, compact ? styles.bannerCompact : styles.bannerFull, style]}
    >
      <View style={styles.sheen} pointerEvents="none" />
      <View style={styles.content}>
        {!compact && displayTitle && displayBody ? (
          <Text style={[styles.title, { color: bg.textColor }]}>{displayTitle}</Text>
        ) : null}
        <Text
          style={[
            styles.body,
            compact ? styles.bodyCompact : styles.bodyFull,
            { color: bg.textColor },
          ]}
        >
          {text}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  bannerCompact: {
    minHeight: 140,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  bannerFull: {
    minHeight: 220,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
    opacity: 0.35,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    opacity: 0.95,
  },
  body: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  bodyCompact: { fontSize: 16, lineHeight: 24 },
  bodyFull: { fontSize: 20, lineHeight: 30 },
});
