import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

const LINKS = [
  { href: '/(membre)/profil', label: 'Mon profil', icon: 'person-outline' as const },
  { href: '/(membre)/ma-carte', label: 'Ma carte', icon: 'card-outline' as const },
  { href: '/(membre)/mes-presences', label: 'Mes présences', icon: 'checkmark-done-outline' as const },
  { href: '/(membre)/parametres', label: 'Paramètres', icon: 'settings-outline' as const },
];

export default function MembrePlusScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Plus"
        subtitle={
          [user?.name ?? 'Membre', user?.member_code].filter(Boolean).join(' · ')
        }
        icon="ellipsis-horizontal-circle"
      />
      <Screen
        style={{ backgroundColor: JP.bg, paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={styles.list}>
          {LINKS.map((item) => (
            <Pressable
              key={item.href}
              style={styles.row}
              onPress={() => router.push(item.href as never)}
            >
              <View style={styles.icon}>
                <Ionicons name={item.icon} size={20} color={JP.brand} />
              </View>
              <Text style={styles.label}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={JP.muted} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 20 }} />
        <BigButton
          label="Se déconnecter"
          tone="neutral"
          onPress={() => {
            void logout().then(() => router.replace('/(auth)/connexion'));
          }}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: JP.text },
});
