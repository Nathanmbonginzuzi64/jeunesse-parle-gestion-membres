import { StyleSheet, View } from 'react-native';
import { CARD } from '@/components/membre/member-card-types';

/** Bandeau jaune · bleu · rouge (footer carte). */
export function FlagStripe({ height = 5 }: { height?: number }) {
  return (
    <View style={[styles.row, { height }]}>
      <View style={[styles.band, { backgroundColor: CARD.flagYellow }]} />
      <View style={[styles.band, { backgroundColor: CARD.brand600 }]} />
      <View style={[styles.band, { backgroundColor: CARD.flagRed }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%', overflow: 'hidden' },
  band: { flex: 1 },
});
