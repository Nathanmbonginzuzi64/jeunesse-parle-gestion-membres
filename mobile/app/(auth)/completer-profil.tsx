import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BigButton, Field, Screen, Subtitle, Title } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

type Place = { id: number; name: string };

/** Inscription mobile : la fonction est toujours « Membre ». */
const MOBILE_POSITION = 'Membre';

function ChoiceChips({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function MultiChips({
  label,
  options,
  values,
  onToggle,
  error,
}: {
  label: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = values.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function firstError(error: ApiError): string {
  const first = Object.values(error.errors)[0]?.[0];
  return first || error.message;
}

export default function CompleterProfilScreen() {
  const { user, refresh, logout, postLoginPath } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cities, setCities] = useState<Place[]>([]);
  const [communes, setCommunes] = useState<Place[]>([]);
  const [zones, setZones] = useState<Place[]>([]);
  const [educationLevels, setEducationLevels] = useState<string[]>([]);
  const [employmentStatuses, setEmploymentStatuses] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [suggestedInterests, setSuggestedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customSkill, setCustomSkill] = useState('');
  const [customInterest, setCustomInterest] = useState('');

  const [form, setForm] = useState({
    phone_alt: '',
    city_id: '',
    commune_id: '',
    zone_id: '',
    position: MOBILE_POSITION,
    education_level: '',
    profession: '',
    employment_status: '',
    activity_domain: '',
    skills: [] as string[],
    interests: [] as string[],
  });

  const needsCompletion = Boolean(user?.needs_profile_completion);

  useEffect(() => {
    if (!user || user.role?.slug !== 'membre') return;
    if (user.member_status === 'pending' || user.needs_structure_choice) {
      router.replace(postLoginPath(user) as never);
      return;
    }
    if (!needsCompletion && user.can_view_card) {
      router.replace('/(membre)/(tabs)' as never);
    }
  }, [user, needsCompletion, router, postLoginPath]);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.get<{
          member?: { province?: { id: number } | null };
        }>('/auth/me');
        setProvinceId(me.member?.province?.id ?? null);
      } catch {
        setProvinceId(null);
      }
    })();
  }, []);

  useEffect(() => {
    void api.public
      .get<{
        education_levels?: string[];
        employment_statuses?: string[];
        activity_domains?: string[];
        suggested_skills?: string[];
        suggested_interests?: string[];
      }>('/references')
      .then((res) => {
        setEducationLevels(res.education_levels ?? []);
        setEmploymentStatuses(res.employment_statuses ?? []);
        setDomains(res.activity_domains ?? []);
        setSuggestedSkills(res.suggested_skills ?? []);
        setSuggestedInterests(res.suggested_interests ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    void api.public
      .get<{ data: Place[] }>('/territories/cities', { province_id: provinceId })
      .then((res) => setCities(res.data ?? []))
      .catch(() => setCities([]));
  }, [provinceId]);

  useEffect(() => {
    if (!form.city_id) {
      setCommunes([]);
      return;
    }
    void api.public
      .get<{ data: Place[] }>('/territories/communes', { city_id: form.city_id })
      .then((res) => setCommunes(res.data ?? []))
      .catch(() => setCommunes([]));
  }, [form.city_id]);

  useEffect(() => {
    if (!form.commune_id) {
      setZones([]);
      return;
    }
    void api.public
      .get<{ data: Place[] }>('/territories/zones', { commune_id: form.commune_id })
      .then((res) => setZones(res.data ?? []))
      .catch(() => setZones([]));
  }, [form.commune_id]);

  const cityOptions = useMemo(
    () => cities.map((item) => ({ value: String(item.id), label: item.name })),
    [cities],
  );
  const communeOptions = useMemo(
    () => communes.map((item) => ({ value: String(item.id), label: item.name })),
    [communes],
  );
  const zoneOptions = useMemo(
    () => zones.map((item) => ({ value: String(item.id), label: item.name })),
    [zones],
  );

  function patch(next: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleList(key: 'skills' | 'interests', value: string) {
    setForm((current) => {
      const list = current[key];
      return {
        ...current,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  }

  function addCustom(key: 'skills' | 'interests', raw: string, clear: () => void) {
    const value = raw.trim();
    if (!value) return;
    setForm((current) => {
      if (current[key].includes(value)) return current;
      return { ...current, [key]: [...current[key], value] };
    });
    clear();
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.phone_alt.trim()) next.phone_alt = 'Téléphone secondaire requis.';
    else if (!/^\+?[0-9]{9,15}$/.test(form.phone_alt.replace(/[\s().-]+/g, ''))) {
      next.phone_alt = 'Numéro invalide (9 à 15 chiffres).';
    }
    if (!form.city_id) next.city_id = 'Choisissez la ville / le territoire.';
    if (!form.commune_id) next.commune_id = 'Choisissez la commune / le secteur.';
    if (!form.education_level) next.education_level = 'Niveau d’études requis.';
    if (!form.profession.trim()) next.profession = 'Profession requise.';
    if (!form.employment_status) next.employment_status = 'Situation requise.';
    if (!form.activity_domain) next.activity_domain = 'Domaine requis.';
    if (form.skills.length === 0) next.skills = 'Sélectionnez au moins une compétence.';
    if (form.interests.length === 0) next.interests = 'Sélectionnez au moins un centre d’intérêt.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      Alert.alert('Formulaire incomplet', 'Complétez les champs obligatoires pour valider votre carte.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.post<{ message: string }>('/auth/complete-profile', {
        phone_alt: form.phone_alt.replace(/[\s().-]+/g, ''),
        city_id: Number(form.city_id),
        commune_id: Number(form.commune_id),
        zone_id: form.zone_id ? Number(form.zone_id) : null,
        position: MOBILE_POSITION,
        education_level: form.education_level,
        profession: form.profession.trim(),
        employment_status: form.employment_status,
        activity_domain: form.activity_domain,
        skills: form.skills,
        interests: form.interests,
      });
      await refresh();
      Alert.alert('Profil validé', response.message || 'Votre carte est maintenant accessible.', [
        { text: 'Voir ma carte', onPress: () => router.replace('/(membre)/(tabs)') },
      ]);
    } catch (error) {
      Alert.alert(
        'Impossible',
        error instanceof ApiError ? firstError(error) : 'Enregistrement impossible.',
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
        <Title center>Compléter mon profil</Title>
        <Subtitle center>
          Renseignez ces informations pour valider et consulter votre carte membre Jeunesse Parle.
        </Subtitle>
      </View>

      <Field
        label="Téléphone secondaire *"
        placeholder="+243…"
        value={form.phone_alt}
        onChangeText={(phone_alt) => patch({ phone_alt })}
        keyboardType="phone-pad"
        error={errors.phone_alt}
      />

      <ChoiceChips
        label="Ville / territoire *"
        options={cityOptions}
        value={form.city_id}
        onChange={(city_id) => patch({ city_id, commune_id: '', zone_id: '' })}
        error={errors.city_id}
      />

      <ChoiceChips
        label="Commune *"
        options={communeOptions}
        value={form.commune_id}
        onChange={(commune_id) => patch({ commune_id, zone_id: '' })}
        error={errors.commune_id}
      />

      {zoneOptions.length > 0 ? (
        <ChoiceChips
          label="Secteur / quartier (optionnel)"
          options={zoneOptions}
          value={form.zone_id}
          onChange={(zone_id) => patch({ zone_id })}
        />
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Fonction</Text>
        <View style={[styles.chip, styles.chipOn, styles.lockedChip]}>
          <Text style={[styles.chipText, styles.chipTextOn]}>{MOBILE_POSITION}</Text>
        </View>
        <Text style={styles.hint}>Fixée à « Membre » pour une inscription via l’application mobile.</Text>
      </View>

      <ChoiceChips
        label="Niveau d’études *"
        options={educationLevels.map((item) => ({ value: item, label: item }))}
        value={form.education_level}
        onChange={(education_level) => patch({ education_level })}
        error={errors.education_level}
      />

      <Field
        label="Profession *"
        placeholder="Ex. Étudiant en droit, commerçant…"
        value={form.profession}
        onChangeText={(profession) => patch({ profession })}
        error={errors.profession}
      />

      <ChoiceChips
        label="Situation *"
        options={employmentStatuses.map((item) => ({ value: item, label: item }))}
        value={form.employment_status}
        onChange={(employment_status) => patch({ employment_status })}
        error={errors.employment_status}
      />

      <ChoiceChips
        label="Domaine d’activité *"
        options={domains.map((item) => ({ value: item, label: item }))}
        value={form.activity_domain}
        onChange={(activity_domain) => patch({ activity_domain })}
        error={errors.activity_domain}
      />

      <MultiChips
        label="Compétences * (plusieurs possibles)"
        options={suggestedSkills}
        values={form.skills}
        onToggle={(value) => toggleList('skills', value)}
        error={errors.skills}
      />
      <Field
        label="Ajouter une compétence"
        placeholder="Saisir puis valider…"
        value={customSkill}
        onChangeText={setCustomSkill}
        onSubmitEditing={() => addCustom('skills', customSkill, () => setCustomSkill(''))}
        returnKeyType="done"
      />
      {form.skills.length > 0 ? (
        <Text style={styles.selected}>Sélection : {form.skills.join(' · ')}</Text>
      ) : null}

      <MultiChips
        label="Centres d’intérêt * (plusieurs possibles)"
        options={suggestedInterests}
        values={form.interests}
        onToggle={(value) => toggleList('interests', value)}
        error={errors.interests}
      />
      <Field
        label="Ajouter un centre d’intérêt"
        placeholder="Saisir puis valider…"
        value={customInterest}
        onChangeText={setCustomInterest}
        onSubmitEditing={() => addCustom('interests', customInterest, () => setCustomInterest(''))}
        returnKeyType="done"
      />
      {form.interests.length > 0 ? (
        <Text style={styles.selected}>Sélection : {form.interests.join(' · ')}</Text>
      ) : null}

      <BigButton label="Envoyer et accéder à ma carte" onPress={() => void submit()} loading={saving} />
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
  body: { paddingBottom: 40 },
  hero: { alignItems: 'center', marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { marginBottom: 8, fontSize: 13, fontWeight: '700', color: JP.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: JP.white,
  },
  chipOn: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  chipText: { fontSize: 13, fontWeight: '600', color: JP.muted },
  chipTextOn: { color: JP.brandDark },
  lockedChip: { alignSelf: 'flex-start', opacity: 0.95 },
  hint: { marginTop: 8, fontSize: 12, color: JP.muted, fontWeight: '500' },
  error: { marginTop: 6, color: JP.danger, fontSize: 12, fontWeight: '600' },
  selected: { marginTop: -6, marginBottom: 12, fontSize: 12, color: JP.brand, fontWeight: '600' },
});
