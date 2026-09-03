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
    <Screen scroll={false}>
      <Title>Présences</Title>
      <Subtitle>Activités ouvertes au pointage dans votre périmètre.</Subtitle>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={() => void load()}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingVertical: 16, gap: 8 }}
        ListEmptyComponent={
          !loading ? (
            <Card>
              <Text style={styles.muted}>Aucune activité planifiée ou en cours.</Text>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.row, params.activityId === String(item.id) && styles.rowActive]}>
            <Pressable
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: '/(agent)/(tabs)/verifier',
                  params: { activityId: String(item.id) },
                })
              }
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.code} · {item.attendances_count ?? 0} présence(s)
              </Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(agent)/(tabs)/scan-qr',
                    params: { activityId: String(item.id), activityTitle: item.title },
                  })
                }
              >
                <Text style={styles.actionText}>QR</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnAlt]}
                onPress={() =>
                  router.push({
                    pathname: '/(agent)/(tabs)/empreinte',
                    params: { activityId: String(item.id), activityTitle: item.title },
                  })
                }
              >
                <Text style={styles.actionText}>Empreinte</Text>
              </Pressable>
            </View>
          </View>
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
    gap: 8,
  },
  rowActive: { borderColor: JP.brand, backgroundColor: JP.brandLight },
  title: { fontWeight: '700', color: JP.text, fontSize: 15 },
  muted: { color: JP.muted, fontSize: 13, marginTop: 2 },
  actions: { gap: 6 },
  actionBtn: {
    backgroundColor: JP.brand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnAlt: { backgroundColor: JP.brandDark },
  actionText: { color: JP.white, fontSize: 11, fontWeight: '800' },
});
