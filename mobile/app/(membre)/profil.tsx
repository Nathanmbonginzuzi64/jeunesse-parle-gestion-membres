import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { useAuth } from '@/lib/auth';
import { api, getToken } from '@/lib/api';
import { JP } from '@/constants/theme';

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

export default function MembreProfilScreen() {
  const { user } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authHeader, setAuthHeader] = useState<Record<string, string> | undefined>();

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthHeader(token ? { Authorization: `Bearer ${token}` } : undefined);
      const me = await api.get<{ member?: MemberProfile | null }>('/auth/me');
      setMember(me.member ?? null);
    } catch {
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const photo = member?.photo_url || user?.photo_url;

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Mon profil"
        subtitle={member?.full_name || user?.name || 'Membre'}
        icon="person-outline"
        showBack
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 36 }}>
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.hero}>
              {photo ? (
                <Image source={{ uri: photo, headers: authHeader }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoEmpty]}>
                  <Text style={styles.letter}>{(user?.name ?? '?').slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <Text style={styles.name}>{member?.full_name || user?.name}</Text>
              <Text style={styles.code}>{user?.member_code}</Text>
            </View>

            <Field label="Nom complet" value={member?.full_name || user?.name} />
            <Field label="Téléphone" value={member?.phone || user?.phone} />
            <Field label="Téléphone secondaire" value={member?.phone_alt} />
            <Field label="Email" value={member?.email || user?.email} />
            <Field label="Date de naissance" value={member?.birth_date} />
            <Field label="Province" value={member?.province?.name} />
            <Field label="Ville" value={member?.city?.name} />
            <Field label="Commune" value={member?.commune?.name} />
            <Field label="Structure" value={member?.structure?.name || user?.member_structure_name} />
            <Field label="Fonction" value={member?.position} />
            <Field label="Études" value={member?.education_level} />
            <Field label="Profession" value={member?.profession} />
            <Field label="Situation" value={member?.employment_status} />
            <Field label="Domaine" value={member?.activity_domain} />
            <Field label="Compétences" value={(member?.skills ?? []).join(' · ') || null} />
            <Field label="Centres d’intérêt" value={(member?.interests ?? []).join(' · ') || null} />
          </>
        )}
      </Screen>
    </View>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value?.trim() ? value : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: 20 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: JP.brandLight,
    marginBottom: 12,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 32, fontWeight: '800', color: JP.brand },
  name: { fontSize: 20, fontWeight: '800', color: JP.text },
  code: { marginTop: 4, fontSize: 13, fontWeight: '700', color: JP.brand },
  field: {
    backgroundColor: JP.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    marginBottom: 8,
  },
  label: { fontSize: 11, fontWeight: '700', color: JP.muted, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '600', color: JP.text },
});
