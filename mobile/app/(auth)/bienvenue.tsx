import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { BigButton } from '@/components/ui';
import { BrandLockup } from '@/components/brand-logo';
import { JP } from '@/constants/theme';
import { ONBOARDING_SLIDES } from '@/lib/legal-content';
import { markOnboardingSeen } from '@/lib/onboarding';

export default function BienvenueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof ONBOARDING_SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const last = index === ONBOARDING_SLIDES.length - 1;

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  async function continueFlow() {
    if (!last) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      void Haptics.selectionAsync();
      return;
    }
    await markOnboardingSeen();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(auth)/confidentialite');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <BrandLockup size={40} compact />
        <Pressable
          onPress={() => {
            void markOnboardingSeen().then(() => router.replace('/(auth)/confidentialite'));
          }}
          hitSlop={8}
        >
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Animated.View entering={FadeIn.duration(420)} style={styles.iconWrap}>
              <Ionicons name={item.icon} size={36} color={JP.white} />
            </Animated.View>
            <Text style={styles.kicker}>{item.kicker}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <View style={styles.rule} />
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <Animated.View
        entering={FadeInUp.delay(120).duration(400)}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
      >
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <BigButton label={last ? 'Continuer' : 'Suivant'} onPress={() => void continueFlow()} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: JP.white },
  top: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skip: { color: JP.muted, fontWeight: '700', fontSize: 14 },
  slide: {
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: JP.brand,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: JP.text,
    letterSpacing: -0.5,
  },
  rule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: JP.brand,
    marginTop: 16,
  },
  text: {
    marginTop: 14,
    fontSize: 17,
    lineHeight: 26,
    color: JP.muted,
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JP.border,
  },
  dotOn: {
    width: 22,
    backgroundColor: JP.brand,
  },
});
