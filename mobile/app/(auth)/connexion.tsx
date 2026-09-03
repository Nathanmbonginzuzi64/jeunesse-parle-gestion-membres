import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(500)} style={styles.brand}>
            <BrandLogo size={88} />
            <Text style={styles.wordmark}>JEUNESSE PARLE</Text>
            <Title center>Connexion</Title>
            <Subtitle center>Espace membre ou agent de vérification.</Subtitle>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(420)}>
            <Field
              label="E-mail ou téléphone"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={loginValue}
              onChangeText={setLoginValue}
            />
            <Field
              label="Mot de passe"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <BigButton label="Se connecter" onPress={() => void onSubmit()} loading={loading} />
          </Animated.View>

          <View style={styles.legal}>
            <TextLink label="Confidentialité" onPress={() => router.push('/(auth)/confidentialite')} />
            <Text style={styles.dot}>·</Text>
            <TextLink label="Conditions" onPress={() => router.push('/(auth)/conditions')} />
            <Text style={styles.dot}>·</Text>
            <TextLink label="Mentions" onPress={() => router.push('/(auth)/mentions')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
    gap: 4,
  },
  brand: {
    marginBottom: 32,
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
  legal: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: { color: JP.muted, fontSize: 14 },
});
