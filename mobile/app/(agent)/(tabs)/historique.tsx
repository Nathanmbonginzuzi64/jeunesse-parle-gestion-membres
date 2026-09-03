import { StyleSheet, Text } from 'react-native';
import { Card, Screen, Subtitle, Title } from '@/components/ui';
import { JP } from '@/constants/theme';

export default function HistoriqueScreen() {
  return (
    <Screen>
      <Title>Historique</Title>
      <Subtitle>Traçabilité des vérifications et pointages de la session.</Subtitle>
      <Card>
        <Text style={styles.text}>
          Les opérations sont journalisées côté serveur (audit + feuilles de présence). L’historique
          local enrichi arrivera avec le mode hors ligne.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { color: JP.muted, fontSize: 14, lineHeight: 20 },
});
