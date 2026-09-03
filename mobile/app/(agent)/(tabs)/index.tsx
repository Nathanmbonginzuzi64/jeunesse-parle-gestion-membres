import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BigButton, Card, Screen, Subtitle, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { JP } from '@/constants/theme';

interface ActivityRow {
  id: number;
  code: string;
  title: string;
  status: string;
  starts_at: string | null;
}

export default function AgentHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [today, setToday] = useState<ActivityRow[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: ActivityRow[] }>('/activities/for-attendance', {
        per_page: 5,
      });
      setToday(response.data ?? []);
    } catch {
      setToday([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Title>Vérification</Title>
      <Subtitle>Bonjour {user?.name ?? ''}. Identifiez un membre rapidement sur le terrain.</Subtitle>

      <View style={styles.actions}>
        <BigButton label="Vérifier un membre" onPress={() => router.push('/(agent)/(tabs)/verifier')} />
        <View style={{ height: 10 }} />
        <BigButton
          label="Scanner un QR Code"
          tone="success"
          onPress={() => router.push('/(agent)/(tabs)/scan-qr')}
        />
      </View>

      <Text style={styles.section}>Activités pour pointage</Text>
      {today.length === 0 ? (
        <Card>
          <Text style={styles.muted}>Aucune activité planifiée ou en cours.</Text>
        </Card>
      ) : (
        today.map((activity) => (
          <Pressable
            key={activity.id}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/(agent)/(tabs)/presences',
                params: { activityId: String(activity.id) },
              })
            }
          >
            <Text style={styles.rowTitle}>{activity.title}</Text>
            <Text style={styles.muted}>{activity.code}</Text>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { marginTop: 20, marginBottom: 24 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: JP.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    backgroundColor: JP.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: JP.text },
  muted: { color: JP.muted, fontSize: 13, marginTop: 2 },
});
