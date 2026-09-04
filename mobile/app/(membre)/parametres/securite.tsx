import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricLabel,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
} from '@/lib/biometric-auth';
import { JP } from '@/constants/theme';

export default function ParametresSecuriteScreen() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioLabel, setBioLabel] = useState('biométrie');
  const [showBioPassword, setShowBioPassword] = useState(false);
  const [bioPassword, setBioPassword] = useState('');
  const [bioBusy, setBioBusy] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Sécurité"
        subtitle="Protégez votre compte"
        icon="shield-checkmark-outline"
        showBack
        showNotifications={false}
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.intro}>
          Gérez la connexion biométrique et le mot de passe de votre compte membre.
        </Text>

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
          <Text style={styles.cardText}>
            Changez votre mot de passe depuis votre profil. Après modification, reconnectez-vous sur
            les autres appareils.
          </Text>
          <BigButton
            label="Ouvrir mon profil"
            tone="neutral"
            onPress={() => router.push('/(membre)/profil')}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Ionicons name="phone-portrait-outline" size={20} color={JP.brand} />
            <Text style={styles.cardTitle}>Session appareil</Text>
          </View>
          <Text style={styles.cardText}>
            Votre session est liée à cet appareil. En cas de perte du téléphone, changez votre mot de
            passe et contactez un responsable Jeunesse Parle.
          </Text>
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: 13,
    lineHeight: 19,
    color: JP.muted,
    fontWeight: '600',
    marginBottom: 14,
  },
  card: {
    backgroundColor: JP.card,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
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
});
