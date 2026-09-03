import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';
import { JP } from '@/constants/theme';

export default function MembreParametresScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  function soon(label: string) {
    Alert.alert(label, 'Cette option sera disponible prochainement.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Paramètres"
        subtitle="Sécurité et préférences"
        icon="settings-outline"
        showBack
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 36 }}>
        <View style={styles.list}>
          <Row
            icon="shield-checkmark-outline"
            label="Sécurité"
            onPress={() => soon('Sécurité')}
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/(membre)/notifications')}
          />
          <Row icon="lock-closed-outline" label="Confidentialité" onPress={() => soon('Confidentialité')} />
          <Row icon="language-outline" label="Langue" value="Français" onPress={() => soon('Langue')} />
        </View>

        <Text style={styles.api}>API : {API_BASE_URL}</Text>

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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={18} color={JP.brand} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
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
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: JP.text },
  value: { fontSize: 12, fontWeight: '600', color: JP.muted, marginRight: 4 },
  api: { marginTop: 18, fontSize: 11, color: JP.muted, textAlign: 'center' },
});
