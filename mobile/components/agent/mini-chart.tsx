import { StyleSheet, Text, View } from 'react-native';
import { JP } from '@/constants/theme';

export function AgentMiniChart({
  labels,
  series,
  color = JP.brand,
  title,
}: {
  labels: string[];
  series: number[];
  color?: string;
  title: string;
}) {
  const max = Math.max(1, ...series);
  const trackH = 88;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {series.map((value, index) => (
          <View key={`${labels[index]}-${index}`} style={styles.col}>
            <View style={[styles.barTrack, { height: trackH }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: Math.max(6, Math.round((value / max) * trackH)),
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label} numberOfLines={1}>
              {labels[index] ?? ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  title: { fontSize: 13, fontWeight: '800', color: JP.text, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 120 },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: JP.bg,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  value: { fontSize: 10, fontWeight: '800', color: JP.text },
  label: { fontSize: 9, fontWeight: '600', color: JP.muted },
});
