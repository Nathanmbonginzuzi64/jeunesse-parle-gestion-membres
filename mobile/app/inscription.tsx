import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '@/components/date-field';
import { KeyboardSafe } from '@/components/keyboard-safe';
import { PhotoField, type PickedPhoto } from '@/components/photo-field';
import { BigButton, Field, Screen } from '@/components/ui';
import { BrandLogo } from '@/components/brand-logo';
import { useAuth } from '@/lib/auth';
import { ApiError, api, deviceName } from '@/lib/api';
import { JP } from '@/constants/theme';

type Place = { id: number; name: string };

const STEPS = ['Identité', 'Contact', 'Province', 'Accès', 'Consentement'] as const;

function passwordRules(password: string) {
  return {
    length: password.length >= 8,
    letters: /[A-Za-z]/.test(password),
    numbers: /\d/.test(password),
  };
}

function isPasswordCompatible(password: string): boolean {
  const rules = passwordRules(password);
  return rules.length && rules.letters && rules.numbers;
}

function PasswordChecks({
  password,
  confirmation,
}: {
  password: string;
  confirmation: string;
}) {
  const rules = passwordRules(password);
  const compatible = isPasswordCompatible(password);
  const matches = confirmation.length > 0 && password === confirmation;
  const items = [
    { ok: rules.length, label: 'Au moins 8 caractères' },
    { ok: rules.letters, label: 'Au moins une lettre' },
    { ok: rules.numbers, label: 'Au moins un chiffre' },
    {
      ok: matches,
      label: matches ? 'Les deux mots de passe sont identiques' : 'Les deux mots de passe doivent être identiques',
    },
  ];

  return (
    <View style={styles.checks}>
      {items.map((item) => (
        <View key={item.label} style={styles.checkItem}>
          <Ionicons
            name={item.ok ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={item.ok ? JP.success : JP.muted}
          />
          <Text style={[styles.checkLabel, item.ok && styles.checkLabelOk]}>{item.label}</Text>
        </View>
      ))}
      {compatible && matches ? (
        <Text style={styles.okBanner}>Mot de passe valide et confirmé.</Text>
      ) : null}
    </View>
  );
}

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

function firstError(error: ApiError): string {
  const first = Object.values(error.errors)[0]?.[0];
  return first || error.message;
}

export default function InscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { applySession, postLoginPath } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState<Place[]>([]);
  const [cities, setCities] = useState<Place[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [form, setForm] = useState({
    last_name: '',
    middle_name: '',
    first_name: '',
    gender: '',
    birth_date: '',
    birth_place: '',
    phone: '',
    email: '',
    address: '',
    province_id: '',
    city_id: '',
    password: '',
    password_confirmation: '',
    consent_given: false,
    confirm_duplicate: false,
  });

  function patch(next: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...next }));
  }

  useEffect(() => {
    void api.public
      .get<{ data: Place[] }>('/territories/provinces')
      .then((res) => setProvinces(res.data ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.province_id) {
      setCities([]);
      return;
    }
    void api.public
      .get<{ data: Place[] }>('/territories/cities', { province_id: form.province_id })
      .then((res) => setCities(res.data ?? []))
      .catch(() => setCities([]));
  }, [form.province_id]);

  const provinceOptions = useMemo(
    () => provinces.map((item) => ({ value: String(item.id), label: item.name })),
    [provinces],
  );
  const cityOptions = useMemo(
    () => cities.map((item) => ({ value: String(item.id), label: item.name })),
    [cities],
  );

  function validateStep(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.last_name.trim()) next.last_name = 'Nom requis.';
      if (!form.first_name.trim()) next.first_name = 'Prénom requis.';
      if (!form.gender) next.gender = 'Choisissez le sexe.';
      if (!form.birth_date.trim()) next.birth_date = 'Choisissez votre date de naissance.';
      if (!photo) next.photo = 'Ajoutez une photo d’identité.';
    }
    if (step === 1) {
      if (!form.phone.trim()) next.phone = 'Téléphone requis.';
    }
    if (step === 2) {
      if (!form.province_id) next.province_id = 'Province requise.';
    }
    if (step === 3) {
      if (!isPasswordCompatible(form.password)) {
        next.password = '8 caractères minimum, avec lettres et chiffres.';
      }
      if (form.password !== form.password_confirmation || !form.password_confirmation) {
        next.password_confirmation = 'La confirmation ne correspond pas.';
      }
    }
    if (step === 4 && !form.consent_given) {
      next.consent_given = 'Le consentement est obligatoire.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(confirmDuplicate = form.confirm_duplicate) {
    setLoading(true);
    setErrors({});
    try {
      const payload = new FormData();
      payload.append('last_name', form.last_name.trim());
      if (form.middle_name.trim()) payload.append('middle_name', form.middle_name.trim());
      payload.append('first_name', form.first_name.trim());
      payload.append('gender', form.gender);
      payload.append('birth_date', form.birth_date.trim());
      if (form.birth_place.trim()) payload.append('birth_place', form.birth_place.trim());
      payload.append('phone', form.phone.trim());
      if (form.email.trim()) payload.append('email', form.email.trim());
      if (form.address.trim()) payload.append('address', form.address.trim());
      payload.append('province_id', form.province_id);
      if (form.city_id) payload.append('city_id', form.city_id);
      payload.append('password', form.password);
      payload.append('password_confirmation', form.password_confirmation);
      payload.append('consent_given', '1');
      if (confirmDuplicate) payload.append('confirm_duplicate', '1');
      payload.append('device_name', deviceName());
      if (photo) {
        payload.append('photo', {
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        } as unknown as Blob);
      }

      const response = await api.public.post<{ token: string; message: string }>(
        '/auth/register',
        payload,
      );
      const user = await applySession(response.token);
      Alert.alert(
        'Demande transmise',
        'Votre dossier est en attente d’approbation par un super-administrateur. Vous serez notifié une fois le compte validé.',
        [{ text: 'OK', onPress: () => router.replace(postLoginPath(user) as never) }],
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        Alert.alert(
          'Dossier similaire',
          error.message + '\n\nConfirmez-vous qu’il s’agit bien d’une nouvelle adhésion ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Confirmer',
              onPress: () => {
                patch({ confirm_duplicate: true });
                void submit(true);
              },
            },
          ],
        );
        return;
      }
      if (error instanceof ApiError) {
        const mapped = Object.fromEntries(
          Object.entries(error.errors).map(([key, messages]) => [key, messages[0] ?? '']),
        );
        setErrors(mapped);
        Alert.alert('Inscription impossible', firstError(error));
      } else {
        Alert.alert('Inscription impossible', 'Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    void submit();
  }

  return (
    <Screen style={{ paddingTop: Math.max(insets.top, 8), backgroundColor: JP.white }}>
      <View style={styles.header}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep((s) => s - 1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={JP.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Adhésion</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardSafe>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <BrandLogo size={56} />
            <Text style={styles.kicker}>Nouveau membre</Text>
            <Text style={styles.title}>Demander mon adhésion</Text>
            <Text style={styles.lead}>
              Dossier examiné par un responsable. Carte et QR après validation.
            </Text>
          </View>

          <View style={styles.steps}>
            {STEPS.map((label, index) => (
              <View key={label} style={[styles.stepDot, index <= step && styles.stepDotOn]} />
            ))}
          </View>
          <Text style={styles.stepLabel}>
            Étape {step + 1}/{STEPS.length} · {STEPS[step]}
          </Text>

          {step === 0 ? (
            <>
              <PhotoField value={photo} onChange={setPhoto} error={errors.photo} />
              <Field label="Nom" value={form.last_name} onChangeText={(last_name) => patch({ last_name })} error={errors.last_name} />
              <Field label="Postnom" value={form.middle_name} onChangeText={(middle_name) => patch({ middle_name })} />
              <Field label="Prénom" value={form.first_name} onChangeText={(first_name) => patch({ first_name })} error={errors.first_name} />
              <ChoiceChips
                label="Sexe"
                value={form.gender}
                onChange={(gender) => patch({ gender })}
                options={[
                  { value: 'M', label: 'Homme' },
                  { value: 'F', label: 'Femme' },
                ]}
                error={errors.gender}
              />
              <DateField
                label="Date de naissance"
                value={form.birth_date}
                onChange={(birth_date) => patch({ birth_date })}
                error={errors.birth_date}
                maximumDate={new Date(new Date().getFullYear() - 16, new Date().getMonth(), new Date().getDate())}
                minimumDate={new Date(new Date().getFullYear() - 80, 0, 1)}
              />
              <Field label="Lieu de naissance" value={form.birth_place} onChangeText={(birth_place) => patch({ birth_place })} />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field
                label="Téléphone"
                placeholder="+243…"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(phone) => patch({ phone })}
                error={errors.phone}
              />
              <Field
                label="E-mail (optionnel)"
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(email) => patch({ email })}
                error={errors.email}
              />
              <Field label="Adresse" value={form.address} onChangeText={(address) => patch({ address })} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <ChoiceChips
                label="Province"
                value={form.province_id}
                onChange={(province_id) => patch({ province_id, city_id: '' })}
                options={provinceOptions}
                error={errors.province_id}
              />
              {cityOptions.length ? (
                <ChoiceChips
                  label="Ville (optionnel)"
                  value={form.city_id}
                  onChange={(city_id) => patch({ city_id })}
                  options={cityOptions}
                />
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field
                label="Mot de passe"
                passwordToggle
                value={form.password}
                onChangeText={(password) => patch({ password })}
                error={errors.password}
                valid={isPasswordCompatible(form.password)}
              />
              <Field
                label="Confirmation"
                passwordToggle
                value={form.password_confirmation}
                onChangeText={(password_confirmation) => patch({ password_confirmation })}
                error={
                  form.password_confirmation.length > 0 && form.password !== form.password_confirmation
                    ? 'Les mots de passe ne sont pas identiques.'
                    : errors.password_confirmation
                }
                valid={
                  form.password_confirmation.length > 0 &&
                  form.password === form.password_confirmation &&
                  isPasswordCompatible(form.password)
                }
              />
              <PasswordChecks password={form.password} confirmation={form.password_confirmation} />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <View style={styles.summary}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.summaryPhoto} />
                ) : null}
                <Text style={styles.summaryName}>
                  {form.first_name} {form.middle_name} {form.last_name}
                </Text>
                <Text style={styles.summaryMeta}>{form.phone}{form.email ? ` · ${form.email}` : ''}</Text>
              </View>
              <Pressable onPress={() => patch({ consent_given: !form.consent_given })} style={styles.checkRow}>
                <View style={[styles.box, form.consent_given && styles.boxOn]}>
                  {form.consent_given ? <Ionicons name="checkmark" size={16} color={JP.white} /> : null}
                </View>
                <Text style={styles.checkText}>
                  J’accepte le traitement de mes données pour l’adhésion à Jeunesse Parle.
                </Text>
              </Pressable>
              {errors.consent_given ? <Text style={styles.error}>{errors.consent_given}</Text> : null}
            </>
          ) : null}

          <View style={{ height: 16 }} />
          <BigButton
            label={step === STEPS.length - 1 ? 'Envoyer ma demande' : 'Suivant'}
            onPress={next}
            loading={loading}
          />
          {step === 0 ? (
            <Text style={styles.loginHint}>
              Déjà membre ?{' '}
              <Text style={styles.loginLink} onPress={() => router.replace('/connexion')}>
                Se connecter
              </Text>
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardSafe>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: JP.text },
  body: { paddingBottom: 36 },
  intro: { alignItems: 'center', marginBottom: 18 },
  kicker: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: JP.brand,
  },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', color: JP.text, textAlign: 'center' },
  lead: { marginTop: 6, fontSize: 14, color: JP.muted, textAlign: 'center', lineHeight: 20 },
  steps: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: JP.border },
  stepDotOn: { backgroundColor: JP.brand, width: 18 },
  stepLabel: { textAlign: 'center', color: JP.muted, fontSize: 12, fontWeight: '600', marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: JP.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: JP.border,
    backgroundColor: JP.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: JP.brand, borderColor: JP.brand },
  chipText: { color: JP.text, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: JP.white },
  error: { marginTop: 6, color: JP.danger, fontSize: 12 },
  checks: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkLabel: { fontSize: 13, color: JP.muted, flex: 1 },
  checkLabelOk: { color: JP.success, fontWeight: '600' },
  okBanner: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: JP.success,
  },
  summary: {
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: JP.bg,
    alignItems: 'center',
  },
  summaryPhoto: {
    width: 88,
    height: 112,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: JP.white,
  },
  summaryName: { fontWeight: '700', fontSize: 16, color: JP.text },
  summaryMeta: { marginTop: 4, color: JP.muted, fontSize: 13 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: JP.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: JP.brand, borderColor: JP.brand },
  checkText: { flex: 1, fontSize: 13, lineHeight: 19, color: JP.text },
  loginHint: { marginTop: 18, textAlign: 'center', color: JP.muted, fontSize: 14 },
  loginLink: { color: JP.brand, fontWeight: '700' },
});
