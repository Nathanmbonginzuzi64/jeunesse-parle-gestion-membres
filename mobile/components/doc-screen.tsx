import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JP } from '@/constants/theme';
import type { LegalSection } from '@/lib/legal-content';

export function DocScreen({
  title,
  kicker,
  intro,
  sections,
  footer,
  onBack,
}: {
  title: string;
  kicker: string;
  intro?: string;
  sections: LegalSection[];
  footer?: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: JP.white }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          hitSlop={12}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={JP.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: footer ? 24 : insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {sections.map((section) => (
          <View key={section.title} style={styles.block}>
            <View style={styles.rule} />
            <Text style={styles.section}>{section.title}</Text>
            {section.paragraphs.map((p) => (
              <Text key={p.slice(0, 40)} style={styles.p}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: JP.white },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: JP.border,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: JP.text,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: JP.brand,
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    color: JP.text,
    letterSpacing: -0.4,
  },
  intro: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: JP.text,
  },
  block: { marginTop: 22 },
  rule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: JP.brand,
    marginBottom: 12,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
    color: JP.text,
    marginBottom: 8,
  },
  p: {
    fontSize: 15,
    lineHeight: 23,
    color: JP.muted,
  },
});
