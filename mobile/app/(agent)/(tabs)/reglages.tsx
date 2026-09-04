import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MembrePageHeader } from '@/components/membre/page-header';
import { SectionHeader } from '@/components/membre/section';
import { AgentIconBadge } from '@/components/agent/agent-ui';
import { BigButton, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { JP } from '@/constants/theme';

export default function ReglagesScreen() {
  const { user, logout, can } = useAuth();
  const router = useRouter();
  const hasMember = Boolean(user?.member_id);

  const permissions = [
    { key: PERMISSIONS.cardsVerify, label: 'Vérifier les cartes', icon: 'shield-checkmark-outline' as const },
    { key: PERMISSIONS.attendanceRecord, label: 'Enregistrer les présences', icon: 'checkmark-done-outline' as const },
    { key: PERMISSIONS.attendanceView, label: 'Consulter les feuilles', icon: 'list-outline' as const },
    { key: PERMISSIONS.membersView, label: 'Voir les membres', icon: 'people-outline' as const },
    { key: PERMISSIONS.cardsView, label: 'Voir les cartes', icon: 'card-outline' as const },
  ];

  const accountLinks = [
    {
      href: '/(agent)/securite',
      label: 'Paramètres (limité)',
      icon: 'shield-checkmark-outline' as const,
      hint: 'Mot de passe · empreinte · profil',
    },
    hasMember
      ? {
          href: '/(agent)/profil',
          label: 'Mon profil',
          icon: 'person-outline' as const,
          hint: user?.member_code ?? 'Dossier membre',
        }
      : null,
    hasMember && user?.can_view_card
      ? {
          href: '/(agent)/ma-carte',
          label: 'Ma carte',
          icon: 'card-outline' as const,
          hint: 'QR et téléchargement',
        }
      : null,
    can(PERMISSIONS.cardsVerify)
      ? {
          href: '/(agent)/(tabs)/membres-verifies',
          label: 'Membres vérifiés',
          icon: 'people-outline' as const,
          hint: 'Liste avec recherche',
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    hint: string;
  }>;

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Plus"
        subtitle={[user?.name ?? 'Agent', user?.role?.name].filter(Boolean).join(' · ')}
        icon="ellipsis-horizontal-circle"
      />

      <Screen
        style={{ backgroundColor: JP.bg, paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <SectionHeader title="Mon compte" />
        <View style={styles.list}>
          {accountLinks.map((item) => (
            <Pressable
              key={item.href}
              style={styles.row}
              onPress={() => router.push(item.href as never)}
            >
              <AgentIconBadge icon={item.icon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowHint}>{item.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={JP.muted} />
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Compte" />
        <View style={styles.card}>
          <Text style={styles.label}>Connecté</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.meta}>{user?.email ?? user?.phone}</Text>
        </View>

        <SectionHeader title="Autorisations" />
        <View style={styles.list}>
          {permissions.map((item) => {
            const ok = can(item.key);
            return (
              <View key={item.key} style={styles.row}>
                <AgentIconBadge icon={item.icon} color={ok ? JP.brand : JP.muted} />
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={[styles.rowState, { color: ok ? JP.success : JP.muted }]}>
                  {ok ? 'Oui' : 'Non'}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 20 }} />
        <BigButton
          label="Se déconnecter"
          tone="neutral"
          onPress={() => {
            Alert.alert('Déconnexion', 'Fermer la session sur cet appareil ?', [
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
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
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
  },
  rowLabel: { fontSize: 14, color: JP.text, fontWeight: '700' },
  rowHint: { marginTop: 2, fontSize: 11, color: JP.muted, fontWeight: '600' },
  rowState: { fontSize: 13, fontWeight: '800' },
});
