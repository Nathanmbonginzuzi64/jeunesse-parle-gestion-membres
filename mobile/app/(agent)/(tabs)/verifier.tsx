import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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

export default function VerifierScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MemberHit[]>([]);

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
      },
    });
  }

  return (
    <Screen>
      <Title>Vérifier un membre</Title>
      <Subtitle>Recherche, QR Code ou biométrie — identification rapide sur le terrain.</Subtitle>

      <View style={{ height: 16 }} />
      <Field
        label="Numéro / Nom"
        placeholder="JP-RDC-… ou nom"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => void search()}
        returnKeyType="search"
      />
      <BigButton label="Rechercher" onPress={() => void search()} loading={loading} />

      <View style={styles.grid}>
        <Pressable style={[styles.cta, styles.ctaPrimary]} onPress={() => router.push('/(agent)/(tabs)/scan-qr')}>
          <Text style={styles.ctaEmoji}>📷</Text>
          <Text style={styles.ctaTitle}>Scanner QR Code</Text>
        </Pressable>
        <Pressable
          style={[styles.cta, styles.ctaSecondary]}
          onPress={() =>
            Alert.alert(
              'Biométrie',
              'Placez le doigt sur le lecteur compatible ou utilisez la vérification par code membre + empreinte matériel. Le matching reste côté serveur — aucune empreinte brute n’est stockée sur l’appareil.',
            )
          }
        >
          <Text style={styles.ctaEmoji}>👆</Text>
          <Text style={styles.ctaTitle}>Biométrie</Text>
        </Pressable>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        style={{ marginTop: 12 }}
        renderItem={({ item }) => (
          <Pressable style={styles.result} onPress={() => openMember(item)}>
            <Text style={styles.resultName}>{item.full_name}</Text>
            <Text style={styles.resultMeta}>{item.member_code}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
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
