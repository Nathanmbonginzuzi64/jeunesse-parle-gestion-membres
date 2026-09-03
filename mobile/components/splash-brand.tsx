import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '@/components/brand-logo';
import { JP } from '@/constants/theme';
import { APP_TAGLINE } from '@/lib/legal-content';

function PulseRing({ delay, size }: { delay: number; size: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0.45, 0.28, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.72, 1.55]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
        style,
      ]}
    />
  );
}

export function SplashBrand({ onReady }: { onReady?: () => void }) {
  const logoScale = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);
  const textY = useSharedValue(22);
  const textOpacity = useSharedValue(0);
  const bar = useSharedValue(0.06);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 420 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 140, mass: 0.8 });
    textOpacity.value = withDelay(380, withTiming(1, { duration: 500 }));
    textY.value = withDelay(380, withSpring(0, { damping: 16, stiffness: 160 }));
    bar.value = withDelay(
      280,
      withSequence(
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [bar, logoOpacity, logoScale, textOpacity, textY]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <View style={styles.root} onLayout={() => onReady?.()}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <View style={styles.logoStage}>
          <PulseRing delay={0} size={220} />
          <PulseRing delay={450} size={220} />
          <PulseRing delay={900} size={220} />
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <BrandLogo size={148} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, textStyle]}>
          <Text style={styles.name}>LA JEUNESSE PARLE</Text>
          <Text style={styles.tag}>{APP_TAGLINE}</Text>
        </Animated.View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.loading}>Chargement</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: JP.brand,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  logoWrap: {
    width: 148,
    height: 148,
    borderRadius: 74,
    overflow: 'hidden',
    backgroundColor: JP.brand,
    shadowColor: '#001428',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  copy: {
    marginTop: 28,
    alignItems: 'center',
  },
  name: {
    color: JP.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  tag: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  bottom: {
    gap: 10,
  },
  loading: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  track: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: JP.white,
    borderRadius: 99,
  },
});
