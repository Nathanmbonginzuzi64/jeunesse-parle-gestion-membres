import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BigButton, Field, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, ApiError, getToken } from '@/lib/api';
import { syncBiometricCredentials } from '@/lib/biometric-auth';
import { JP, type JpColors } from '@/constants/theme';
import type { PickedPhoto } from '@/components/photo-field';

type MemberProfile = {
  full_name?: string;
  phone?: string | null;
  phone_alt?: string | null;
  email?: string | null;
  birth_date?: string | null;
  photo_url?: string | null;
  education_level?: string | null;
  profession?: string | null;
  employment_status?: string | null;
  activity_domain?: string | null;
  position?: string | null;
  skills?: string[];
  interests?: string[];
  province?: { name?: string } | null;
  city?: { name?: string } | null;
  commune?: { name?: string } | null;
  structure?: { name?: string } | null;
};

function passwordRules(value: string) {
  const lengthOk = value.length >= 8;
  const letterOk = /[A-Za-zÀ-ÿ]/.test(value);
  const numberOk = /\d/.test(value);
  return {
    lengthOk,
    letterOk,
    numberOk,
    valid: lengthOk && letterOk && numberOk,
  };
}

export default function MembreProfilScreen() {
  const { user, refresh } = useAuth();
  const styles = useMemo(() => makeStyles(JP), []);

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authHeader, setAuthHeader] = useState<Record<string, string> | undefined>();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pickedPhoto, setPickedPhoto] = useState<PickedPhoto | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthHeader(token ? { Authorization: `Bearer ${token}` } : undefined);
      const me = await api.get<{ member?: MemberProfile | null; user?: typeof user }>('/auth/me');
      setMember(me.member ?? null);
      setName(me.user?.name || me.member?.full_name || user?.name || '');
      setEmail(me.user?.email || me.member?.email || user?.email || '');
      setPhone(me.user?.phone || me.member?.phone || user?.phone || '');
      setPhotoPreview(me.member?.photo_url || me.user?.photo_url || user?.photo_url || null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const rules = passwordRules(newPassword);
  const currentFilled = currentPassword.length > 0;
  const confirmMatch =
    confirmPassword.length > 0 && confirmPassword === newPassword && rules.valid;
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const passwordFormReady =
    currentFilled && rules.valid && confirmMatch && newPassword !== currentPassword;

  async function pickPhoto(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        fromCamera
          ? 'Autorisez l’appareil photo pour changer votre photo.'
          : 'Autorisez l’accès à la galerie pour changer votre photo.',
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = (asset.mimeType ?? 'image/jpeg').toLowerCase();
    const mime = type.includes('png') ? 'image/png' : type.includes('webp') ? 'image/webp' : 'image/jpeg';
    const photo: PickedPhoto = {
      uri: asset.uri,
      name: asset.fileName || `profil.${mime.split('/')[1]}`,
      type: mime,
    };
    setPickedPhoto(photo);
    setPhotoPreview(photo.uri);
  }

  function onChangePhoto() {
    Alert.alert('Photo de profil', 'Choisir une source', [
      { text: 'Galerie', onPress: () => void pickPhoto(false) },
      { text: 'Appareil photo', onPress: () => void pickPhoto(true) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function onSaveProfile() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Champs requis', 'Le nom et l’e-mail sont obligatoires.');
      return;
    }
    setSavingProfile(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('email', email.trim().toLowerCase());
      if (phone.trim()) form.append('phone', phone.trim());
      if (pickedPhoto) {
        form.append('photo', {
          uri: pickedPhoto.uri,
          name: pickedPhoto.name,
          type: pickedPhoto.type,
        } as unknown as Blob);
      }
      await api.post('/auth/profile', form);
      setPickedPhoto(null);
      await refresh();
      await load();
      Alert.alert('Profil', 'Profil mis à jour.');
    } catch (error) {
      Alert.alert(
        'Profil',
        error instanceof ApiError ? error.message : 'Impossible de mettre à jour le profil.',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword() {
    if (!passwordFormReady) {
      Alert.alert(
        'Mot de passe',
        'Vérifiez le mot de passe actuel, le nouveau (8+ car., lettres et chiffres) et la confirmation.',
      );
      return;
    }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      const loginId = (email || phone || user?.email || user?.phone || '').trim();
      if (loginId) {
        await syncBiometricCredentials(loginId, newPassword);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sécurité', 'Mot de passe modifié.');
    } catch (error) {
      Alert.alert(
        'Mot de passe',
        error instanceof ApiError ? error.message : 'Impossible de changer le mot de passe.',
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const displayPhoto = photoPreview;

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Mon profil"
        subtitle={name || user?.name || 'Membre'}
        icon="person-outline"
        showBack
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 48 }}>
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.hero}>
              <Pressable onPress={onChangePhoto} style={styles.photoWrap} accessibilityLabel="Modifier la photo">
                {displayPhoto ? (
                  <Image
                    source={
                      displayPhoto.startsWith('file:') || displayPhoto.startsWith('content:')
                        ? { uri: displayPhoto }
                        : { uri: displayPhoto, headers: authHeader }
                    }
                    style={styles.photo}
                  />
                ) : (
                  <View style={[styles.photo, styles.photoEmpty]}>
                    <Text style={styles.letter}>{(name || '?').slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={14} color={JP.onBrand} />
                </View>
              </Pressable>
              <Text style={styles.name}>{name || user?.name}</Text>
              <Text style={styles.code}>{user?.member_code}</Text>
              <Text style={styles.hint}>Touchez la photo pour la modifier</Text>
            </View>

            <Text style={styles.section}>Informations du compte</Text>
            <Field label="Nom complet" value={name} onChangeText={setName} />
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <BigButton
              label="Enregistrer le profil"
              onPress={() => void onSaveProfile()}
              loading={savingProfile}
            />

            <Text style={[styles.section, { marginTop: 28 }]}>Sécurité</Text>
            <Field
              label="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              passwordToggle
              valid={currentFilled}
              error={!currentFilled && (newPassword.length > 0 || confirmPassword.length > 0)
                ? 'Indiquez votre mot de passe actuel'
                : undefined}
            />
            <Field
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              passwordToggle
              valid={rules.valid}
              error={
                newPassword.length > 0 && !rules.valid
                  ? 'Au moins 8 caractères, une lettre et un chiffre'
                  : newPassword.length > 0 && newPassword === currentPassword
                    ? 'Le nouveau mot de passe doit être différent'
                    : undefined
              }
            />
            <View style={styles.rules}>
              <Rule ok={rules.lengthOk} label="8 caractères minimum" JP={JP} />
              <Rule ok={rules.letterOk} label="Au moins une lettre" JP={JP} />
              <Rule ok={rules.numberOk} label="Au moins un chiffre" JP={JP} />
            </View>
            <Field
              label="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              passwordToggle
              valid={confirmMatch}
              error={confirmMismatch ? 'Les mots de passe ne correspondent pas' : undefined}
            />
            <BigButton
              label="Changer le mot de passe"
              onPress={() => void onChangePassword()}
              loading={savingPassword}
              disabled={!passwordFormReady}
              tone="brand"
            />

            <Text style={[styles.section, { marginTop: 28 }]}>Dossier membre</Text>
            <Info label="Téléphone secondaire" value={member?.phone_alt} JP={JP} styles={styles} />
            <Info label="Date de naissance" value={member?.birth_date} JP={JP} styles={styles} />
            <Info label="Province" value={member?.province?.name} JP={JP} styles={styles} />
            <Info label="Ville" value={member?.city?.name} JP={JP} styles={styles} />
            <Info label="Commune" value={member?.commune?.name} JP={JP} styles={styles} />
            <Info
              label="Structure"
              value={member?.structure?.name || user?.member_structure_name}
              JP={JP}
              styles={styles}
            />
            <Info label="Fonction" value={member?.position} JP={JP} styles={styles} />
            <Info label="Études" value={member?.education_level} JP={JP} styles={styles} />
            <Info label="Profession" value={member?.profession} JP={JP} styles={styles} />
            <Info label="Situation" value={member?.employment_status} JP={JP} styles={styles} />
            <Info label="Domaine" value={member?.activity_domain} JP={JP} styles={styles} />
            <Info
              label="Compétences"
              value={(member?.skills ?? []).join(' · ') || null}
              JP={JP}
              styles={styles}
            />
            <Info
              label="Centres d’intérêt"
              value={(member?.interests ?? []).join(' · ') || null}
              JP={JP}
              styles={styles}
            />
          </>
        )}
      </Screen>
    </View>
  );
}

function Rule({ ok, label, JP }: { ok: boolean; label: string; JP: JpColors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? JP.success : JP.muted}
      />
      <Text style={{ fontSize: 12, fontWeight: '600', color: ok ? JP.success : JP.muted }}>
        {label}
      </Text>
    </View>
  );
}

function Info({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | null;
  JP: JpColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value?.trim() ? value : '—'}</Text>
    </View>
  );
}

function makeStyles(JP: JpColors) {
  return StyleSheet.create({
    hero: { alignItems: 'center', marginBottom: 20 },
    photoWrap: { position: 'relative', marginBottom: 12 },
    photo: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: JP.brandLight,
    },
    photoEmpty: { alignItems: 'center', justifyContent: 'center' },
    cameraBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: JP.brand,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: JP.bg,
    },
    letter: { fontSize: 34, fontWeight: '800', color: JP.brand },
    name: { fontSize: 20, fontWeight: '800', color: JP.text },
    code: { marginTop: 4, fontSize: 13, fontWeight: '700', color: JP.brand },
    hint: { marginTop: 6, fontSize: 12, color: JP.muted },
    section: {
      marginBottom: 10,
      fontSize: 13,
      fontWeight: '800',
      color: JP.text,
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    rules: {
      marginTop: -6,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    field: {
      backgroundColor: JP.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: JP.border,
      padding: 12,
      marginBottom: 8,
    },
    label: { fontSize: 11, fontWeight: '700', color: JP.muted, marginBottom: 4 },
    value: { fontSize: 15, fontWeight: '600', color: JP.text },
  });
}
