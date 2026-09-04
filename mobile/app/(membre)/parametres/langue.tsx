import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

const LOCALES = [
  {
    id: 'fr',
    label: 'Français',
    native: 'Français',
    hint: 'Langue de l’application (recommandée)',
  },
  {
    id: 'ln',
    label: 'Lingala',
    native: 'Lingála',
    hint: 'Préférence enregistrée — interface bientôt disponible',
  },
  {
    id: 'en',
    label: 'English',
    native: 'English',
    hint: 'Préférence enregistrée — interface bientôt disponible',
  },
] as const;

type LocaleId = (typeof LOCALES)[number]['id'];

export default function ParametresLangueScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locale, setLocale] = useState<LocaleId>('fr');

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: { locale?: string } }>('/user-preferences');
      const value = (res.data?.locale || 'fr') as LocaleId;
      setLocale(LOCALES.some((l) => l.id === value) ? value : 'fr');
    } catch (err) {
      Alert.alert('Langue', err instanceof ApiError ? err.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function select(next: LocaleId) {
    if (next === locale) return;
    const previous = locale;
    setLocale(next);
    setSaving(true);
    try {
      await api.put('/user-preferences', { locale: next });
      if (next !== 'fr') {
        Alert.alert(
          'Langue',
          'Préférence enregistrée. L’application reste en français pour le moment ; les autres langues arriveront bientôt.',
        );
      }
    } catch (err) {
      setLocale(previous);
      Alert.alert('Langue', err instanceof ApiError ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Langue"
        subtitle="Préférence d’affichage"
        icon="language-outline"
        showBack
        showNotifications={false}
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.intro}>
              Choisissez la langue préférée de votre compte. Le français est actuellement la langue
              complète de l’application mobile.
            </Text>
            {saving ? <Text style={styles.saving}>Enregistrement…</Text> : null}

            <View style={styles.list}>
              {LOCALES.map((item) => {
                const selected = locale === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.row, selected && styles.rowOn]}
                    onPress={() => void select(item.id)}
                  >
                    <View style={[styles.icon, selected && styles.iconOn]}>
                      <Ionicons
                        name="globe-outline"
                        size={18}
                        color={selected ? JP.onBrand : JP.brand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, selected && styles.labelOn]}>{item.label}</Text>
                      <Text style={styles.native}>{item.native}</Text>
                      <Text style={styles.hint}>{item.hint}</Text>
                    </View>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={JP.brand} />
                    ) : (
                      <View style={styles.radio} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 19, color: JP.muted, fontWeight: '600', marginBottom: 14 },
  saving: { fontSize: 12, color: JP.brand, fontWeight: '700', marginBottom: 8 },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.card,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    padding: 14,
  },
  rowOn: { borderColor: JP.brand, backgroundColor: '#F0F9FF' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: JP.brand },
  label: { fontSize: 15, fontWeight: '800', color: JP.text },
  labelOn: { color: JP.brandDark },
  native: { marginTop: 2, fontSize: 12, fontWeight: '600', color: JP.muted },
  hint: { marginTop: 4, fontSize: 11, color: JP.muted, lineHeight: 15 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: JP.border,
  },
});
