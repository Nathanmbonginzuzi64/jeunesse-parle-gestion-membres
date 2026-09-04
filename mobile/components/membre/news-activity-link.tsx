import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/lib/api';
import type { NewsLinkedActivity } from '@/lib/news';
import { JP } from '@/constants/theme';

function formatWhen(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  activity: NewsLinkedActivity;
  compact?: boolean;
  onRegistered?: (activity: NewsLinkedActivity) => void;
};

/** Bloc activité liée à une actualité — consultation + inscription rapide. */
export function NewsActivityLink({ activity, compact = false, onRegistered }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(Boolean(activity.is_registered));
  const when = formatWhen(activity.starts_at);

  useEffect(() => {
    setRegistered(Boolean(activity.is_registered));
  }, [activity.id, activity.is_registered]);

  async function register() {
    if (registered || busy) return;
    setBusy(true);
    try {
      await api.post(`/activities/${activity.id}/register`);
      const next = { ...activity, is_registered: true };
      setRegistered(true);
      onRegistered?.(next);
      Alert.alert('Inscription', 'Vous êtes inscrit(e) à cette activité.', [
        {
          text: 'Voir l’activité',
          onPress: () => router.push(`/(membre)/activite/${activity.id}`),
        },
        { text: 'OK' },
      ]);
    } catch (err) {
      Alert.alert(
        'Inscription',
        err instanceof ApiError ? err.message : 'Impossible de s’inscrire pour le moment.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="calendar" size={16} color={JP.onBrand} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>Activité liée</Text>
          <Text style={styles.title} numberOfLines={2}>
            {activity.title}
          </Text>
        </View>
      </View>

      {activity.type_label || activity.status_label ? (
        <Text style={styles.metaLine} numberOfLines={1}>
          {[activity.type_label, activity.status_label].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      {when ? (
        <View style={styles.row}>
          <Ionicons name="time-outline" size={14} color={JP.muted} />
          <Text style={styles.meta}>{when}</Text>
        </View>
      ) : null}

      {activity.location ? (
        <View style={styles.row}>
          <Ionicons name="location-outline" size={14} color={JP.muted} />
          <Text style={styles.meta} numberOfLines={1}>
            {activity.location}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push(`/(membre)/activite/${activity.id}`)}
        >
          <Text style={styles.secondaryText}>Voir l’activité</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, registered && styles.primaryDone]}
          onPress={() => void (registered ? router.push(`/(membre)/activite/${activity.id}`) : register())}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={JP.onBrand} size="small" />
          ) : (
            <>
              <Ionicons
                name={registered ? 'checkmark-circle' : 'person-add-outline'}
                size={15}
                color={registered ? JP.success : JP.onBrand}
              />
              <Text style={[styles.primaryText, registered && styles.primaryTextDone]}>
                {registered ? 'Inscrit' : "S'inscrire"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: 12,
    gap: 6,
  },
  wrapCompact: { marginTop: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    color: JP.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: { marginTop: 2, fontSize: 14, fontWeight: '800', color: JP.text, lineHeight: 18 },
  metaLine: { fontSize: 11, fontWeight: '700', color: JP.brandDark },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flex: 1, fontSize: 12, fontWeight: '600', color: JP.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: JP.brand,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: JP.white,
  },
  secondaryText: { fontSize: 12, fontWeight: '800', color: JP.brand },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: JP.brand,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryDone: {
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  primaryText: { fontSize: 12, fontWeight: '800', color: JP.onBrand },
  primaryTextDone: { color: JP.success },
});
