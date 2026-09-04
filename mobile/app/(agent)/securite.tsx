import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Field, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
} from '@/lib/biometric-auth';
import { JP } from '@/constants/theme';

export default function AgentSecuriteScreen() {
  const { user, login, refresh } = useAuth();
  const router = useRouter();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('biométrie');
  const [showBioPassword, setShowBioPassword] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioBusy, setBioBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setBioAvailable(await isBiometricHardwareAvailable());
        setBioEnabled(await isBiometricLoginEnabled());
        setBioLabel(await getBiometricLabel());
      })();
    }, []),
  );

  async function onToggleBiometric() {
    if (bioEnabled) {
      await disableBiometricLogin();
      setBioEnabled(false);
      setShowBioPassword(false);
      Alert.alert('Biométrie', 'Connexion biométrique désactivée.');
      return;
    }
    setShowBioPassword(true);
  }

  async function confirmEnableBiometric() {
    const loginId = (user?.email || user?.phone || '').trim();
    if (!loginId) {
      Alert.alert('Biométrie', 'Identifiant introuvable. Reconnectez-vous.');
      return;
    }
    if (!bioPassword) {
      Alert.alert('Biométrie', 'Saisissez votre mot de passe pour activer la biométrie.');
      return;
    }
    setBioBusy(true);
    try {
      await login(loginId, bioPassword);
      const ok = await enableBiometricLogin(loginId, bioPassword);
      if (ok) {
        setBioEnabled(true);
        setShowBioPassword(false);
        setBioPassword('');
        Alert.alert('Biométrie', `${bioLabel} activée sur cet appareil.`);
      } else {
        Alert.alert('Biométrie', 'Activation annulée ou biométrie indisponible.');
      }
    } catch (error) {
      Alert.alert(
        'Biométrie',
        error instanceof ApiError ? error.message : 'Mot de passe incorrect.',
      );
    } finally {
      setBioBusy(false);
    }
  }

  async function changePassword() {
    setPwdError(null);
    if (password.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== passwordConfirmation) {
      setPwdError('La confirmation ne correspond pas.');
      return;
    }
    setPwdBusy(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      await refresh();
      Alert.alert('Mot de passe', 'Mot de passe mis à jour.');
    } catch (error) {
      setPwdError(
        error instanceof ApiError ? error.message : 'Impossible de changer le mot de passe.',
      );
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Paramètres agent"
        subtitle="Profil limité · sécurité · empreinte"
        icon="shield-checkmark-outline"
        showBack
        showNotifications={false}
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.card}>
          <Text style={styles.label}>Compte</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.meta}>{user?.email ?? user?.phone}</Text>
          <Text style={styles.meta}>{user?.role?.name}</Text>
          {user?.member_id ? (
            <Pressable style={styles.link} onPress={() => router.push('/(agent)/profil')}>
              <Ionicons name="person-outline" size={16} color={JP.brand} />
              <Text style={styles.linkText}>Modifier le profil membre</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="finger-print-outline" size={20} color={JP.brand} />
            <Text style={styles.cardTitle}>Connexion {bioLabel}</Text>
          </View>
          <Text style={styles.cardText}>
            {bioAvailable
              ? `Utilisez ${bioLabel} pour ouvrir l’application plus rapidement sur cet appareil.`
              : 'Aucune biométrie détectée sur cet appareil.'}
          </Text>
          {bioAvailable ? (
            <>
              <Pressable
                onPress={() => void onToggleBiometric()}
                style={[styles.toggle, bioEnabled && styles.toggleOn]}
              >
                <Text style={[styles.toggleText, bioEnabled && styles.toggleTextOn]}>
                  {bioEnabled ? 'Activée' : 'Désactivée'} — toucher pour changer
                </Text>
              </Pressable>
              {showBioPassword ? (
                <View style={styles.bioBox}>
                  <Text style={styles.bioTitle}>Mot de passe pour activer</Text>
                  <TextInput
                    value={bioPassword}
                    onChangeText={setBioPassword}
                    secureTextEntry
                    placeholder="Mot de passe"
                    placeholderTextColor={JP.muted}
                    style={styles.bioInput}
                  />
                  <View style={{ height: 10 }} />
                  <BigButton
                    label="Activer"
                    onPress={() => void confirmEnableBiometric()}
                    loading={bioBusy}
                  />
                  <View style={{ height: 8 }} />
                  <BigButton
                    label="Annuler"
                    tone="neutral"
                    onPress={() => {
                      setShowBioPassword(false);
                      setBioPassword('');
                    }}
                  />
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="key-outline" size={20} color={JP.brand} />
            <Text style={styles.cardTitle}>Mot de passe</Text>
          </View>
          <Field
            label="Mot de passe actuel"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={{ height: 8 }} />
          <Field
            label="Nouveau mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={{ height: 8 }} />
          <Field
            label="Confirmer"
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            secureTextEntry
            autoCapitalize="none"
          />
          {pwdError ? <Text style={styles.error}>{pwdError}</Text> : null}
          <View style={{ height: 10 }} />
          <BigButton
            label="Enregistrer le mot de passe"
            loading={pwdBusy}
            onPress={() => void changePassword()}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: JP.card,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: JP.muted,
  },
  value: { marginTop: 6, fontSize: 18, fontWeight: '800', color: JP.text },
  meta: { marginTop: 4, fontSize: 13, color: JP.muted, lineHeight: 18 },
  link: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkText: { fontSize: 13, fontWeight: '700', color: JP.brand },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: JP.text },
  cardText: { fontSize: 13, lineHeight: 19, color: JP.muted, fontWeight: '500', marginBottom: 12 },
  toggle: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.bg,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  toggleOn: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  toggleText: { fontSize: 13, fontWeight: '700', color: JP.text },
  toggleTextOn: { color: JP.brandDark },
  bioBox: { marginTop: 12 },
  bioTitle: { fontSize: 13, fontWeight: '700', color: JP.text, marginBottom: 8 },
  bioInput: {
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: JP.text,
    backgroundColor: JP.bg,
  },
  error: { marginTop: 8, color: JP.danger, fontSize: 12, fontWeight: '700' },
});
