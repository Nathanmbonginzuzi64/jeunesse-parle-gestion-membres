import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Field, Screen, Subtitle, Title } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

type StructureRow = {
  id: number;
  name: string;
  type?: string | null;
};

export default function ChoixStructureScreen() {
  const { user, refresh, logout, postLoginPath } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<StructureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const needsChoice = Boolean(
    user?.needs_structure_choice ||
      (user?.member_status === 'active' && !user?.member_structure_id),
  );

  useEffect(() => {
    if (user && user.role?.slug === 'membre' && !needsChoice) {
      router.replace(postLoginPath(user) as never);
    }
  }, [user, needsChoice, router, postLoginPath]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get<{
        member?: { province?: { id: number } | null };
      }>('/auth/me');
      const provinceId = me.member?.province?.id;
      const response = await api.public.get<{ data: StructureRow[] }>('/territories/structures', {
        province_id: provinceId ?? undefined,
      });
      setItems(response.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, q]);

  async function confirm() {
    if (!selectedId) {
      Alert.alert('Structure requise', 'Choisissez la structure à laquelle vous appartenez.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<{ message: string }>('/auth/structure', {
        structure_id: selectedId,
      });
      await refresh();
      Alert.alert('Structure enregistrée', response.message || 'Passez à la complétion du profil.', [
        { text: 'Continuer', onPress: () => router.replace('/(auth)/completer-profil') },
      ]);
    } catch (error) {
      Alert.alert(
        'Impossible',
        error instanceof ApiError ? error.message : 'Enregistrement impossible.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      style={{ paddingTop: Math.max(insets.top, 12), backgroundColor: JP.white }}
      contentContainerStyle={styles.body}
    >
      <View style={styles.hero}>
        <BrandLogo size={64} />
        <Title center>Votre structure</Title>
        <Subtitle center>
          Votre compte est approuvé. Indiquez la structure Jeunesse Parle dont vous êtes membre,
          puis complétez votre profil pour accéder à votre carte.
        </Subtitle>
      </View>

      <Field
        label="Rechercher"
        placeholder="Nom de la structure…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
      />
      <Text style={styles.count}>{loading ? 'Chargement…' : `${filtered.length} structure(s)`}</Text>

      <View style={styles.list}>
        {filtered.map((item) => {
          const on = selectedId === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelectedId(item.id)}
              style={[styles.row, on && styles.rowOn]}
            >
              <View style={[styles.icon, on && styles.iconOn]}>
                <Ionicons name="business-outline" size={18} color={on ? JP.white : JP.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, on && styles.nameOn]}>{item.name}</Text>
                {item.type ? <Text style={styles.meta}>{item.type}</Text> : null}
              </View>
              {on ? <Ionicons name="checkmark-circle" size={22} color={JP.brand} /> : null}
            </Pressable>
          );
        })}
        {!loading && filtered.length === 0 ? (
          <Text style={styles.empty}>Aucune structure disponible pour votre province.</Text>
        ) : null}
      </View>

      <BigButton label="Confirmer ma structure" onPress={() => void confirm()} loading={saving} />
      <View style={{ height: 10 }} />
      <BigButton
        label="Se déconnecter"
        tone="neutral"
        onPress={() => {
          void logout().then(() => router.replace('/(auth)/connexion'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: 36 },
  hero: { alignItems: 'center', marginBottom: 18 },
  count: { marginBottom: 10, fontSize: 12, color: JP.muted, fontWeight: '600' },
  list: { gap: 8, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: JP.white,
  },
  rowOn: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: JP.brand },
  name: { fontSize: 15, fontWeight: '700', color: JP.text },
  nameOn: { color: JP.brandDark },
  meta: { marginTop: 2, fontSize: 12, color: JP.muted, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: JP.muted, paddingVertical: 20 },
});
