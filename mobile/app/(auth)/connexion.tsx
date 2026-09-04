import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BigButton, Field, Screen, Subtitle, TextLink, Title } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { ApiError, discoverApiBaseUrl } from '@/lib/api';
import {
  authenticateWithBiometrics,
  enableBiometricLogin,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
} from '@/lib/biometric-auth';
import { useTheme } from '@/lib/theme-context';

export default function ConnexionScreen() {
  const { login, postLoginPath } = useAuth();
  const { colors: JP } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState('biométrie');

  useEffect(() => {
    void discoverApiBaseUrl().catch(() => undefined);
    void (async () => {
      const available = await isBiometricHardwareAvailable();
      const enabled = await isBiometricLoginEnabled();
      const label = await getBiometricLabel();
      setBioAvailable(available);
      setBioEnabled(enabled);
      setBioLabel(label);
    })();
  }, []);

  async function offerBiometric(loginId: string, pwd: string) {
    if (!(await isBiometricHardwareAvailable())) return;
    if (await isBiometricLoginEnabled()) return;

    const label = await getBiometricLabel();
    Alert.alert(
      'Connexion biométrique',
      `Activer la connexion par ${label} sur cet appareil ?`,
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Activer',
          onPress: () => {
            void enableBiometricLogin(loginId, pwd).then((ok) => {
              if (ok) {
                setBioEnabled(true);
                Alert.alert('Activé', `Vous pourrez vous connecter avec votre ${label}.`);
              }
            });
          },
        },
      ],
    );
  }

  async function onSubmit() {
    if (!loginValue.trim() || !password) {
      Alert.alert('Champs requis', 'Saisissez votre e-mail ou téléphone et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(loginValue.trim(), password);
      await offerBiometric(loginValue.trim(), password);
      router.replace(postLoginPath(user) as never);
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.message
          : 'Vérifiez vos identifiants et la connexion au serveur.';
      Alert.alert('Connexion impossible', detail);
    } finally {
      setLoading(false);
    }
  }

  async function onBiometricLogin() {
    setBioLoading(true);
    try {
      const creds = await authenticateWithBiometrics();
      if (!creds) return;
      const user = await login(creds.login, creds.password);
      router.replace(postLoginPath(user) as never);
    } catch (error) {
      const detail =
        error instanceof ApiError
          ? error.message
          : 'Connexion biométrique impossible. Utilisez votre mot de passe.';
      Alert.alert('Connexion impossible', detail);
    } finally {
      setBioLoading(false);
    }
  }

  return (
    <Screen
      style={{ paddingTop: Math.max(insets.top, 12), backgroundColor: JP.white }}
      contentContainerStyle={styles.content}
    >
      <Animated.View entering={FadeIn.duration(500)} style={styles.brand}>
        <BrandLogo size={88} />
        <Text style={[styles.wordmark, { color: JP.brand }]}>JEUNESSE PARLE</Text>
        <Title center>Connexion</Title>
        <Subtitle center>Espace membre ou agent de vérification.</Subtitle>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.card}>
        <Field
          label="E-mail ou téléphone"
          placeholder="nom@exemple.cd ou +243…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={loginValue}
          onChangeText={setLoginValue}
        />
        <Field
          label="Mot de passe"
          placeholder="••••••••"
          passwordToggle
          value={password}
          onChangeText={setPassword}
        />
        <BigButton label="Se connecter" onPress={() => void onSubmit()} loading={loading} />

        {bioAvailable && bioEnabled ? (
          <>
            <View style={{ height: 12 }} />
            <Pressable
              onPress={() => void onBiometricLogin()}
              disabled={loading || bioLoading}
              style={({ pressed }) => [
                styles.bioBtn,
                {
                  borderColor: JP.brand,
                  backgroundColor: JP.brandLight,
                  opacity: pressed || bioLoading ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Se connecter avec ${bioLabel}`}
            >
              <Ionicons name="finger-print-outline" size={22} color={JP.brand} />
              <Text style={[styles.bioText, { color: JP.brand }]}>
                {bioLoading ? 'Vérification…' : `Connexion par ${bioLabel}`}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Animated.View>

      <Link href="/inscription" asChild>
        <Pressable>
          <Text style={[styles.signup, { color: JP.muted }]}>
            Pas encore membre ? <Text style={{ color: JP.brand, fontWeight: '800' }}>Demander mon adhésion</Text>
          </Text>
        </Pressable>
      </Link>

      <View style={styles.legal}>
        <TextLink label="Confidentialité" onPress={() => router.push('/(auth)/confidentialite')} />
        <Text style={[styles.dot, { color: JP.muted }]}>·</Text>
        <TextLink label="Conditions" onPress={() => router.push('/(auth)/conditions')} />
        <Text style={[styles.dot, { color: JP.muted }]}>·</Text>
        <TextLink label="Mentions" onPress={() => router.push('/(auth)/mentions')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  brand: { alignItems: 'center', marginBottom: 28 },
  wordmark: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  card: { width: '100%' },
  bioBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  bioText: { fontSize: 15, fontWeight: '700' },
  signup: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 14,
  },
  legal: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {},
});
