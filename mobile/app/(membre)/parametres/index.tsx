import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { JP, type JpColors } from '@/constants/theme';

export default function MembreParametresScreen() {
  const { logout } = useAuth();
  const router = useRouter();

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
            value="Biométrie, mot de passe"
            onPress={() => router.push('/(membre)/parametres/securite')}
          />
          <Row
            JP={JP}
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/(membre)/notifications')}
          />
          <Row
            JP={JP}
            icon="lock-closed-outline"
            label="Confidentialité"
            value="Visibilité, contacts"
            onPress={() => router.push('/(membre)/parametres/confidentialite')}
          />
          <Row
            JP={JP}
            icon="language-outline"
            label="Langue"
            value="Français"
            onPress={() => router.push('/(membre)/parametres/langue')}
          />
        </View>

        <View style={{ height: 16 }} />
        <BigButton
          label="Se déconnecter"
          tone="danger"
          onPress={() => {
            Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Déconnecter',
                style: 'destructive',
                onPress: () => {
                  void logout().then(() => router.replace('/(auth)/connexion'));
                },
              },
            ]);
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
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: JP.text }]}>{label}</Text>
        {value ? <Text style={[styles.value, { color: JP.muted }]}>{value}</Text> : null}
      </View>
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
  label: { fontSize: 15, fontWeight: '700' },
  value: { marginTop: 2, fontSize: 12, fontWeight: '600' },
});
