import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Screen, Subtitle, Title } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

export default function EnAttenteScreen() {
  const { user, refresh, logout, postLoginPath } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);

  const stillPending = user?.member_status === 'pending';

  useEffect(() => {
    if (user && !stillPending && user.role?.slug === 'membre') {
      router.replace(postLoginPath(user) as never);
    }
  }, [user, stillPending, router, postLoginPath]);

  async function checkStatus() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen style={{ paddingTop: Math.max(insets.top, 16), justifyContent: 'center' }}>
      <View style={styles.center}>
        <BrandLogo size={72} />
        <View style={styles.iconWrap}>
          <Ionicons name="hourglass-outline" size={28} color={JP.brand} />
        </View>
        <Title center>Demande envoyée</Title>
        <Subtitle center>
          Votre dossier a été transmis au super-administrateur. Il apparaîtra dans Membres → Demandes
          mobile jusqu’à validation. Ensuite, vous choisirez votre structure dans l’application.
        </Subtitle>
        {user?.member_code ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Votre code</Text>
            <Text style={styles.code}>{user.member_code}</Text>
          </View>
        ) : null}
        <Text style={styles.status}>
          Statut : {user?.member_status_label ?? 'En attente'}
        </Text>
      </View>
      <View style={{ height: 20 }} />
      <BigButton label="Vérifier l’approbation" onPress={() => void checkStatus()} loading={checking} />
      <View style={{ height: 10 }} />
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
  center: { alignItems: 'center' },
  iconWrap: {
    marginTop: 18,
    marginBottom: 10,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 220,
  },
  codeLabel: { fontSize: 11, fontWeight: '700', color: JP.muted, textTransform: 'uppercase' },
  code: { marginTop: 4, fontSize: 18, fontWeight: '800', color: JP.brand, letterSpacing: 0.4 },
  status: { marginTop: 14, fontSize: 14, fontWeight: '600', color: JP.warning },
});
