import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JP } from '@/constants/theme';

/** Tuile d’action rapide — même langage visuel que le portail membre. */
export function AgentActionTile({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'brand',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: 'brand' | 'dark' | 'success';
}) {
  const bg =
    tone === 'success' ? JP.success : tone === 'dark' ? JP.brandDark : JP.brand;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={JP.white} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      {subtitle ? <Text style={styles.tileSub}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function AgentListCard({
  children,
  onPress,
  active,
}: {
  children: ReactNode;
  onPress?: () => void;
  active?: boolean;
}) {
  const body = (
    <View style={[styles.listCard, active && styles.listCardActive]}>{children}</View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.94 }]}>
      {body}
    </Pressable>
  );
}

export function AgentChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipOn]}
      disabled={!onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function AgentIconBadge({
  icon,
  color = JP.brand,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 112,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'flex-end',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileTitle: { color: JP.white, fontWeight: '800', fontSize: 15 },
  tileSub: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    marginBottom: 8,
  },
  listCardActive: {
    borderColor: JP.brand,
    backgroundColor: JP.brandLight,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
  },
  chipOn: { backgroundColor: JP.brandLight, borderColor: JP.brand },
  chipText: { fontSize: 12, fontWeight: '700', color: JP.muted },
  chipTextOn: { color: JP.brandDark },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
