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
import { useTheme } from '@/lib/theme-context';
import type { JpColors } from '@/constants/theme';

export default function MembreParametresScreen() {
  const { logout, user, login } = useAuth();
  const { colors: JP, isDark, toggleDark } = useTheme();
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

  function soon(label: string) {
    Alert.alert(label, 'Cette option sera disponible prochainement.');
  }

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
      // Vérifie le mot de passe auprès du serveur avant stockage local
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
        title="Paramètres"
        subtitle="Sécurité et préférences"
        icon="settings-outline"
        showBack
      />
      <Screen
        style={{ backgroundColor: JP.bg, paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <View style={styles.list}>
          <Row
            JP={JP}
            icon="shield-checkmark-outline"
            label="Sécurité"
            onPress={() => soon('Sécurité')}
          />
          <Row
            JP={JP}
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/(membre)/notifications')}
          />
          {bioAvailable ? (
            <Row
              JP={JP}
              icon="finger-print-outline"
              label={`Connexion ${bioLabel}`}
              value={bioEnabled ? 'Activée' : 'Désactivée'}
              onPress={() => void onToggleBiometric()}
            />
          ) : null}
          <Row
            JP={JP}
            icon={isDark ? 'sunny-outline' : 'moon-outline'}
            label="Mode sombre"
            value={isDark ? 'Oui' : 'Non'}
            onPress={toggleDark}
          />
          <Row
            JP={JP}
            icon="lock-closed-outline"
            label="Confidentialité"
            onPress={() => soon('Confidentialité')}
          />
          <Row
            JP={JP}
            icon="language-outline"
            label="Langue"
            value="Français"
            onPress={() => soon('Langue')}
          />
        </View>

        {showBioPassword ? (
          <View style={[styles.bioBox, { backgroundColor: JP.card, borderColor: JP.border }]}>
            <Text style={[styles.bioTitle, { color: JP.text }]}>
              Mot de passe pour activer la {bioLabel}
            </Text>
            <TextInput
              value={bioPassword}
              onChangeText={setBioPassword}
              secureTextEntry
              placeholder="Mot de passe"
              placeholderTextColor={JP.muted}
              style={[
                styles.bioInput,
                { color: JP.text, borderColor: JP.border, backgroundColor: JP.bg },
              ]}
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

        <View style={{ height: 16 }} />
        <BigButton
          label="Se déconnecter"
          tone="danger"
          onPress={() => {
            void logout().then(() => router.replace('/(auth)/connexion'));
          }}
        />
      </Screen>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  JP,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  JP: JpColors;
}) {
  return (
    <Pressable
      style={[styles.row, { backgroundColor: JP.card, borderColor: JP.border }]}
      onPress={onPress}
    >
      <View style={[styles.icon, { backgroundColor: JP.brandLight }]}>
        <Ionicons name={icon} size={18} color={JP.brand} />
      </View>
      <Text style={[styles.label, { color: JP.text }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: JP.muted }]}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={JP.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontWeight: '700' },
  value: { fontSize: 12, fontWeight: '600', marginRight: 4 },
  bioBox: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  bioTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
