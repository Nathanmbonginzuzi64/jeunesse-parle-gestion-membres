import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Card, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

export default function ReglagesScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen style={{ backgroundColor: JP.bg }}>
      <Title>Réglages</Title>
      <Subtitle>Compte agent.</Subtitle>

      <Card>
        <Text style={[styles.label, { color: JP.muted }]}>Connecté</Text>
        <Text style={[styles.value, { color: JP.text }]}>{user?.name}</Text>
        <Text style={[styles.meta, { color: JP.muted }]}>{user?.role?.name}</Text>
        <Text style={[styles.meta, { color: JP.muted }]}>{user?.email ?? user?.phone}</Text>
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: { marginTop: 6, fontSize: 18, fontWeight: '700' },
  meta: { marginTop: 4, fontSize: 13 },
});
