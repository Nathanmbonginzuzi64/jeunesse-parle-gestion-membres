import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Screen, Subtitle, Title } from '@/components/ui';
import { api } from '@/lib/api';
import { JP } from '@/constants/theme';

interface ActivityRow {
  id: number;
  code: string;
  title: string;
  status: string;
  starts_at: string | null;
  attendances_count?: number;
}

export default function PresencesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ activityId?: string }>();
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: ActivityRow[] }>('/activities/for-attendance', {
        per_page: 40,
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

  return (
    <Screen>
      <Title>Présences</Title>
      <Subtitle>Activités ouvertes au pointage dans votre périmètre.</Subtitle>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={{ paddingVertical: 16, gap: 8 }}
        ListEmptyComponent={
          !loading ? (
            <Card>
              <Text style={styles.muted}>Aucune activité planifiée ou en cours.</Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, params.activityId === String(item.id) && styles.rowActive]}
            onPress={() =>
              router.push({
                pathname: '/(agent)/(tabs)/verifier',
                params: { activityId: String(item.id) },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.code} · {item.attendances_count ?? 0} présence(s)
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: JP.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowActive: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  title: { fontWeight: '700', color: JP.text, fontSize: 15 },
  muted: { color: JP.muted, fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22, color: JP.muted, paddingLeft: 8 },
});
