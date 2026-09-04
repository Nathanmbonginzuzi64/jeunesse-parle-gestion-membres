import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { api, ApiError } from '@/lib/api';
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from '@/lib/legal-content';
import { JP } from '@/constants/theme';

type Prefs = {
  who_can_contact?: string;
  read_receipts?: boolean;
  show_online?: boolean;
  show_last_seen?: boolean;
  photo_visibility?: string;
  phone_visibility?: string;
  email_visibility?: string;
};

const CONTACT_OPTIONS = [
  { value: 'authorized', label: 'Membres autorisés' },
  { value: 'structure', label: 'Ma structure' },
  { value: 'leaders', label: 'Responsables seulement' },
  { value: 'admin', label: 'Administration' },
  { value: 'nobody', label: 'Personne' },
] as const;

const VISIBILITY_OPTIONS = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'private', label: 'Privé' },
] as const;

const PHOTO_OPTIONS = [
  { value: 'everyone', label: 'Tout le monde' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'private', label: 'Privé' },
] as const;

export default function ParametresConfidentialiteScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [showPolicy, setShowPolicy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Prefs }>('/user-preferences');
      setPrefs(res.data ?? {});
    } catch (err) {
      Alert.alert(
        'Confidentialité',
        err instanceof ApiError ? err.message : 'Chargement impossible.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function patch(partial: Partial<Prefs>) {
    setPrefs((current) => ({ ...current, ...partial }));
    setSaving(true);
    try {
      const res = await api.put<{ data: Prefs }>('/user-preferences', partial);
      setPrefs(res.data ?? { ...prefs, ...partial });
    } catch (err) {
      Alert.alert(
        'Confidentialité',
        err instanceof ApiError ? err.message : 'Enregistrement impossible.',
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  function choose(
    title: string,
    options: readonly { value: string; label: string }[],
    current: string | undefined,
    key: keyof Prefs,
  ) {
    Alert.alert(title, undefined, [
      ...options.map((option) => ({
        text: `${option.value === current ? '✓ ' : ''}${option.label}`,
        onPress: () => void patch({ [key]: option.value }),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Confidentialité"
        subtitle="Qui voit vos informations"
        icon="lock-closed-outline"
        showBack
        showNotifications={false}
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.intro}>{PRIVACY_INTRO}</Text>
            {saving ? <Text style={styles.saving}>Enregistrement…</Text> : null}

            <Text style={styles.section}>Messagerie</Text>
            <PrefRow
              icon="people-outline"
              label="Qui peut me contacter"
              value={CONTACT_OPTIONS.find((o) => o.value === prefs.who_can_contact)?.label ?? '—'}
              onPress={() =>
                choose('Qui peut me contacter', CONTACT_OPTIONS, prefs.who_can_contact, 'who_can_contact')
              }
            />
            <ToggleRow
              icon="checkmark-done-outline"
              label="Accusés de lecture"
              value={Boolean(prefs.read_receipts)}
              onPress={() => void patch({ read_receipts: !prefs.read_receipts })}
            />
            <ToggleRow
              icon="radio-button-on-outline"
              label="Afficher en ligne"
              value={Boolean(prefs.show_online)}
              onPress={() => void patch({ show_online: !prefs.show_online })}
            />
            <ToggleRow
              icon="time-outline"
              label="Dernière connexion"
              value={Boolean(prefs.show_last_seen)}
              onPress={() => void patch({ show_last_seen: !prefs.show_last_seen })}
            />

            <Text style={[styles.section, { marginTop: 18 }]}>Visibilité</Text>
            <PrefRow
              icon="image-outline"
              label="Photo de profil"
              value={PHOTO_OPTIONS.find((o) => o.value === prefs.photo_visibility)?.label ?? '—'}
              onPress={() =>
                choose('Photo de profil', PHOTO_OPTIONS, prefs.photo_visibility, 'photo_visibility')
              }
            />
            <PrefRow
              icon="call-outline"
              label="Téléphone"
              value={VISIBILITY_OPTIONS.find((o) => o.value === prefs.phone_visibility)?.label ?? '—'}
              onPress={() =>
                choose('Téléphone', VISIBILITY_OPTIONS, prefs.phone_visibility, 'phone_visibility')
              }
            />
            <PrefRow
              icon="mail-outline"
              label="E-mail"
              value={VISIBILITY_OPTIONS.find((o) => o.value === prefs.email_visibility)?.label ?? '—'}
              onPress={() =>
                choose('E-mail', VISIBILITY_OPTIONS, prefs.email_visibility, 'email_visibility')
              }
            />

            <Pressable style={styles.policyBtn} onPress={() => setShowPolicy((v) => !v)}>
              <Text style={styles.policyBtnText}>
                {showPolicy ? 'Masquer la politique' : 'Lire la politique de confidentialité'}
              </Text>
              <Ionicons
                name={showPolicy ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={JP.brand}
              />
            </Pressable>

            {showPolicy
              ? PRIVACY_SECTIONS.map((section) => (
                  <View key={section.title} style={styles.policyBlock}>
                    <Text style={styles.policyTitle}>{section.title}</Text>
                    {section.paragraphs.map((p) => (
                      <Text key={p.slice(0, 24)} style={styles.policyText}>
                        {p}
                      </Text>
                    ))}
                  </View>
                ))
              : null}
          </>
        )}
      </Screen>
    </View>
  );
}

function PrefRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={18} color={JP.brand} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={JP.muted} />
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={18} color={JP.brand} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.switch, value && styles.switchOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 19, color: JP.muted, fontWeight: '600', marginBottom: 12 },
  saving: { fontSize: 12, color: JP.brand, fontWeight: '700', marginBottom: 8 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: JP.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: JP.card,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: JP.text },
  rowValue: { fontSize: 12, fontWeight: '600', color: JP.muted, maxWidth: 120 },
  switch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: { backgroundColor: JP.brand },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: JP.white,
  },
  knobOn: { alignSelf: 'flex-end' },
  policyBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  policyBtnText: { fontSize: 13, fontWeight: '700', color: JP.brand },
  policyBlock: {
    backgroundColor: JP.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    marginBottom: 8,
  },
  policyTitle: { fontSize: 14, fontWeight: '800', color: JP.text, marginBottom: 6 },
  policyText: { fontSize: 12, lineHeight: 18, color: JP.muted, marginBottom: 6 },
});
