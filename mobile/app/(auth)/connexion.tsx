import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function ConnexionScreen() {
  const { login, postLoginPath } = useAuth();
  const router = useRouter();
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
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Text style={styles.brandMark}>JP</Text>
            <Title>Jeunesse Parle</Title>
            <Subtitle>Connexion mobile — membre ou agent de vérification.</Subtitle>
          </View>

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
    marginBottom: 28,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 56,
    backgroundColor: JP.brand,
    color: JP.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
});
