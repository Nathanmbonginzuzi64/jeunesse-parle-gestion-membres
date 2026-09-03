import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

export default function PortailWebScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen style={styles.wrap}>
      <Title>Portail web requis</Title>
      <Subtitle>
        Le compte {user?.role?.name ?? 'administrateur'} utilise le portail web Jeunesse Parle. Cette
        application mobile est réservée aux membres et agents de vérification.
      </Subtitle>
      <View style={{ height: 20 }} />
      <BigButton
        label="Se déconnecter"
        tone="neutral"
        onPress={() => {
          void logout().then(() => router.replace('/(auth)/connexion'));
        }}
      />
      <Text style={styles.hint}>Ouvrez le site web sur ordinateur ou navigateur.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  hint: { marginTop: 16, color: JP.muted, fontSize: 13 },
});
