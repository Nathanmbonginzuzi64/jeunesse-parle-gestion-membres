import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Card, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function ReglagesScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <Title>Réglages</Title>
      <Subtitle>Compte agent et connexion API.</Subtitle>

      <Card>
        <Text style={styles.label}>Connecté</Text>
        <Text style={styles.value}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.role?.name}</Text>
        <Text style={styles.meta}>{user?.email ?? user?.phone}</Text>
      </Card>

      <View style={{ height: 12 }} />
      <Card>
        <Text style={styles.label}>API</Text>
        <Text style={styles.meta}>{API_BASE_URL}</Text>
        <Text style={styles.meta}>Portail : mobile</Text>
      </Card>

      <View style={{ height: 20 }} />
      <BigButton
        label="Se déconnecter"
        tone="danger"
        onPress={() => {
          Alert.alert('Déconnexion', 'Fermer la session sur cet appareil ?', [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Déconnecter',
              style: 'destructive',
              onPress: () => {
                void logout().then(() => router.replace('/(auth)/connexion'));
              },
            },
          ]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: JP.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { marginTop: 6, fontSize: 18, fontWeight: '700', color: JP.text },
  meta: { marginTop: 4, color: JP.muted, fontSize: 13 },
});
