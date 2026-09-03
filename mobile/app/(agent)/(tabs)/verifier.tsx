import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BigButton, Field, Screen, Subtitle, Title } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { JP } from '@/constants/theme';

interface MemberHit {
  id: number;
  member_code: string;
  full_name: string;
  status: string;
  status_label?: string;
  photo_url?: string | null;
  province?: { name: string } | null;
  commune?: { name: string } | null;
  structure?: { name: string } | null;
}

interface ActivityRow {
  id: number;
  title: string;
  code?: string;
}

export default function VerifierScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberHit[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [activityId, setActivityId] = useState<number | null>(
    params.activityId ? Number(params.activityId) : null,
  );

  useEffect(() => {
    void api
      .get<{ data: ActivityRow[] }>('/activities/for-attendance', { per_page: 40 })
      .then((response) => {
        const list = response.data ?? [];
        setActivities(list);
        if (!activityId && list[0]) setActivityId(list[0].id);
      })
      .catch(() => setActivities([]));
  }, []);

  useEffect(() => {
    if (params.activityId) setActivityId(Number(params.activityId));
  }, [params.activityId]);

  const selectedActivity = activities.find((item) => item.id === activityId);

  async function search() {
    if (!q.trim()) {
      Alert.alert('Recherche', 'Saisissez un numéro ou un nom.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<{ data: MemberHit[] }>('/members', {
        q: q.trim(),
        per_page: 15,
      });
      setResults(response.data ?? []);
      if ((response.data ?? []).length === 0) {
        Alert.alert('Aucun résultat', 'Aucun membre ne correspond à cette recherche.');
      }
    } catch (error) {
      Alert.alert('Erreur', error instanceof ApiError ? error.message : 'Recherche impossible.');
    } finally {
      setLoading(false);
    }
  }

  function requireActivity(): boolean {
    if (!activityId) {
      Alert.alert('Activité', 'Sélectionnez une activité de pointage.');
      return false;
    }
    return true;
  }

  function openMember(member: MemberHit) {
    router.push({
      pathname: '/(agent)/(tabs)/fiche-membre',
      params: {
        memberId: String(member.id),
        memberCode: member.member_code,
        fullName: member.full_name,
        statusLabel: member.status_label ?? member.status,
        province: member.province?.name ?? '',
        commune: member.commune?.name ?? '',
        structure: member.structure?.name ?? '',
        photoUrl: member.photo_url ?? '',
        activityId: activityId ? String(activityId) : '',
      },
    });
  }

  return (
    <Screen>
      <Title>Vérifier un membre</Title>
      <Subtitle>
        Choisissez l’activité, puis scannez le QR ou l’empreinte — présence (et inscription)
        automatiques.
      </Subtitle>

      <Text style={styles.section}>Activité de pointage</Text>
      {activities.map((activity) => (
        <Pressable
          key={activity.id}
          onPress={() => setActivityId(activity.id)}
          style={[styles.activityRow, activityId === activity.id && styles.activityOn]}
        >
          <Text style={[styles.activityTitle, activityId === activity.id && styles.activityTitleOn]}>
            {activityId === activity.id ? `✓ ${activity.title}` : activity.title}
          </Text>
          {activity.code ? <Text style={styles.activityCode}>{activity.code}</Text> : null}
        </Pressable>
      ))}
      {activities.length === 0 ? (
        <Text style={styles.meta}>Aucune activité ouverte. Allez dans Présences.</Text>
      ) : null}

      <View style={styles.grid}>
        <Pressable
          style={[styles.cta, styles.ctaPrimary]}
          onPress={() => {
            if (!requireActivity()) return;
            router.push({
              pathname: '/(agent)/(tabs)/scan-qr',
              params: {
                activityId: String(activityId),
                activityTitle: selectedActivity?.title ?? '',
              },
            });
          }}
        >
          <Text style={styles.ctaEmoji}>📷</Text>
          <Text style={styles.ctaTitle}>Scanner QR</Text>
          <Text style={styles.ctaSub}>Présence auto</Text>
        </Pressable>
        <Pressable
          style={[styles.cta, styles.ctaSecondary]}
          onPress={() => {
            if (!requireActivity()) return;
            router.push({
              pathname: '/(agent)/(tabs)/empreinte',
              params: {
                activityId: String(activityId),
                activityTitle: selectedActivity?.title ?? '',
              },
            });
          }}
        >
          <Text style={styles.ctaEmoji}>👆</Text>
          <Text style={styles.ctaTitle}>Empreinte</Text>
          <Text style={styles.ctaSub}>Inscription + présence</Text>
        </Pressable>
      </View>

      <View style={{ height: 16 }} />
      <Field
        label="Recherche manuelle"
        placeholder="JP-RDC-… ou nom"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => void search()}
        returnKeyType="search"
      />
      <BigButton label="Rechercher" onPress={() => void search()} loading={loading} />

      <View style={{ marginTop: 12 }}>
        {results.map((item) => (
          <Pressable key={item.id} style={styles.result} onPress={() => openMember(item)}>
            <Text style={styles.resultName}>{item.full_name}</Text>
            <Text style={styles.resultMeta}>{item.member_code}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: JP.muted,
    textTransform: 'uppercase',
  },
  activityRow: {
    backgroundColor: JP.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    marginBottom: 8,
  },
  activityOn: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  activityTitle: { fontWeight: '700', color: JP.text, fontSize: 14 },
  activityTitleOn: { color: JP.brandDark },
  activityCode: { marginTop: 2, fontSize: 11, color: JP.muted, fontWeight: '600' },
  meta: { color: JP.muted, fontSize: 13, marginBottom: 8 },
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cta: {
    flex: 1,
    minHeight: 110,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'flex-end',
  },
  ctaPrimary: { backgroundColor: JP.brand },
  ctaSecondary: { backgroundColor: JP.brandDark },
  ctaEmoji: { fontSize: 28, marginBottom: 8 },
  ctaTitle: { color: JP.white, fontWeight: '800', fontSize: 15 },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  result: {
    backgroundColor: JP.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    marginBottom: 8,
  },
  resultName: { fontWeight: '700', color: JP.text, fontSize: 15 },
  resultMeta: { color: JP.muted, marginTop: 2, fontFamily: 'monospace' },
});
