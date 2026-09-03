import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JP } from '@/constants/theme';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <View style={styles.bar} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.actionBtn}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 22,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { width: 4, height: 18, borderRadius: 4, backgroundColor: JP.brand },
  title: { fontSize: 17, fontWeight: '800', color: JP.text },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: JP.brandLight,
  },
  action: { fontSize: 12, fontWeight: '800', color: JP.brand },
  empty: {
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: JP.muted, textAlign: 'center' },
  emptySub: { marginTop: 4, fontSize: 12, color: JP.muted, textAlign: 'center', lineHeight: 18 },
});
