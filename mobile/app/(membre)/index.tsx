import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

/** Stub Vague 1 — shell membre complet en Vague 2. */
export default function MembreComingSoon() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <Screen style={styles.wrap}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>APP MEMBRE</Text>
      </View>
      <Title>Bientôt disponible</Title>
      <Subtitle>
        Bonjour {user?.name ?? ''}. L&apos;application membre (carte, activités, messages) arrive dans la
        prochaine vague. Votre compte est bien reconnu.
      </Subtitle>
      <View style={{ height: 24 }} />
      <BigButton
        label="Se déconnecter"
        tone="neutral"
        onPress={() => {
          void logout().then(() => router.replace('/(auth)/connexion'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: JP.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    color: JP.brand,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
