import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { KeyboardSafe } from '@/components/keyboard-safe';
import { BigButton, Field, Screen, Subtitle, TextLink, Title } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function ConnexionScreen() {
  const { login, postLoginPath } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!loginValue.trim() || !password) {
      Alert.alert('Champs requis', 'Saisissez votre e-mail ou téléphone et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(loginValue.trim(), password);
      router.replace(postLoginPath(user) as never);
    } catch (error) {
      Alert.alert(
        'Connexion impossible',
        error instanceof ApiError ? error.message : 'Vérifiez vos identifiants.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ paddingTop: Math.max(insets.top, 12), backgroundColor: JP.white }}>
      <KeyboardSafe>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(500)} style={styles.brand}>
            <BrandLogo size={88} />
            <Text style={styles.wordmark}>JEUNESSE PARLE</Text>
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
          </Animated.View>

          <Link href="/inscription" asChild>
            <Pressable>
              <Text style={styles.signup}>
                Pas encore membre ? <Text style={styles.signupLink}>Demander mon adhésion</Text>
              </Text>
            </Pressable>
          </Link>

          <View style={styles.legal}>
            <TextLink label="Confidentialité" onPress={() => router.push('/(auth)/confidentialite')} />
            <Text style={styles.dot}>·</Text>
            <TextLink label="Conditions" onPress={() => router.push('/(auth)/conditions')} />
            <Text style={styles.dot}>·</Text>
            <TextLink label="Mentions" onPress={() => router.push('/(auth)/mentions')} />
          </View>
        </ScrollView>
      </KeyboardSafe>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  brand: {
    marginBottom: 24,
    alignItems: 'center',
  },
  wordmark: {
    marginTop: 14,
    marginBottom: 18,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: JP.brandDark,
    textAlign: 'center',
  },
  card: {
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 16,
    shadowColor: '#102A43',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  signup: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 14,
    color: JP.muted,
  },
  signupLink: {
    color: JP.brand,
    fontWeight: '700',
  },
  legal: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { color: JP.muted, fontSize: 14 },
});
