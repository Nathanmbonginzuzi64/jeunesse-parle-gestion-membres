import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Screen } from '@/components/ui';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MemberQrCode } from '@/components/membre/member-qr-code';
import { MembrePageHeader } from '@/components/membre/page-header';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type ActivityDetail = {
  id: number;
  title: string;
  code?: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  status?: string;
  status_label?: string;
  type_label?: string;
  image_url?: string | null;
  is_registered?: boolean;
  fingerprint_enrolled?: boolean;
  attendance?: {
    id: number;
    status?: string;
    status_label?: string;
    method?: string;
    recorded_at?: string | null;
  } | null;
  qr?: {
    token?: string;
    verification_url?: string | null;
    qr_svg?: string | null;
  } | null;
  structure?: { name?: string } | null;
  organizer?: { name?: string } | null;
};

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MembreActiviteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = Boolean(opts?.silent);
    if (!silent) setError(null);
    try {
      const response = await api.get<{ data: ActivityDetail }>(`/activities/${id}/for-member`);
      const data = response.data;
      setItem(
        data
          ? {
              ...data,
              image_url: resolveMediaUrl(data.image_url),
            }
          : null,
      );
      setError(null);
    } catch (caught) {
      if (!silent) {
        setItem(null);
        setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useBackgroundRefresh(() => load({ silent: true }));

  const present = item?.attendance?.status === 'present';

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF3F8' }}>
      <MembrePageHeader
        title="Détail activité"
        subtitle={item?.title ?? (loading ? 'Chargement…' : 'Activité')}
        icon="calendar-outline"
        showBack
      />
      <Screen
        style={{ backgroundColor: '#EEF3F8', paddingTop: 8 }}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
            tintColor={JP.brand}
          />
        }
      >
      {loading ? (
        <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.error}>{error}</Text>
          <BigButton label="Réessayer" onPress={() => void load()} />
        </View>
      ) : !item ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Activité introuvable</Text>
        </View>
      ) : (
        <>
          <View style={styles.cover}>
            <AuthenticatedImage
              uri={item.image_url}
              activityCode={item.code}
              fallbackLetter={item.title}
              style={styles.coverImage}
            />
            {item.type_label ? (
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.type_label}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{item.title}</Text>
          {item.code ? <Text style={styles.code}>{item.code}</Text> : null}

          <View style={styles.metaCard}>
            <MetaRow icon="time-outline" label="Début" value={formatWhen(item.starts_at)} />
            <MetaRow icon="flag-outline" label="Statut" value={item.status_label ?? '—'} />
            {item.location ? (
              <MetaRow icon="location-outline" label="Lieu" value={item.location} />
            ) : null}
            {item.structure?.name ? (
              <MetaRow icon="business-outline" label="Structure" value={item.structure.name} />
            ) : null}
            {item.organizer?.name ? (
              <MetaRow icon="person-outline" label="Organisateur" value={item.organizer.name} />
            ) : null}
            <MetaRow
              icon="people-outline"
              label="Inscription"
              value={item.is_registered ? 'Inscrit(e)' : 'Non inscrit(e) — possible via l’agent'}
            />
          </View>

          {item.description ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Description</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Présence à l’activité</Text>

            {present ? (
              <View style={styles.presentBox}>
                <Ionicons name="checkmark-circle" size={28} color={JP.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.presentTitle}>Présence confirmée</Text>
                  <Text style={styles.presentSub}>
                    {item.attendance?.status_label ?? 'Présent'}
                    {item.attendance?.method ? ` · ${item.attendance.method}` : ''}
                    {item.attendance?.recorded_at
                      ? ` · ${formatWhen(item.attendance.recorded_at)}`
                      : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.hint}>
                  Présentez ce QR à l’agent de vérification. Dès le scan, votre présence est
                  confirmée automatiquement
                  {!item.is_registered
                    ? ' (vous serez aussi inscrit(e) à l’activité).'
                    : '.'}
                </Text>

                <View style={styles.qrWrap}>
                  <MemberQrCode
                    value={item.qr?.verification_url || item.qr?.token}
                    svgDataUri={item.qr?.qr_svg}
                    size={220}
                    caption="QR à présenter à l’agent"
                  />
                </View>

                {!item.qr?.verification_url && !item.qr?.token ? (
                  <Text style={styles.hint}>
                    Aucun QR actif — ouvrez « Ma carte » ou faites valider votre carte membre.
                  </Text>
                ) : null}

                <View style={styles.infoBox}>
                  <Ionicons name="finger-print" size={20} color={JP.brand} />
                  <Text style={styles.infoText}>
                    {item.fingerprint_enrolled
                      ? 'Empreinte enregistrée : l’agent peut aussi confirmer votre présence (et vous inscrire) via le lecteur.'
                      : 'Sans empreinte enregistrée, seul le QR (ou l’identification manuelle par l’agent) permet le pointage.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </>
      )}
    </Screen>
    </View>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={JP.brand} />
      <View style={{ flex: 1 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: JP.brandLight,
    marginBottom: 10,
  },
  coverImage: { width: '100%', height: 110 },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,135,209,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeText: { color: JP.white, fontSize: 10, fontWeight: '800' },
  title: { fontSize: 18, fontWeight: '800', color: JP.text, letterSpacing: -0.2 },
  code: { marginTop: 2, fontSize: 11, fontWeight: '700', color: JP.muted },
  metaCard: {
    marginTop: 10,
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    gap: 12,
  },
  metaRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  metaLabel: { fontSize: 11, fontWeight: '700', color: JP.muted, textTransform: 'uppercase' },
  metaValue: { marginTop: 2, fontSize: 14, fontWeight: '700', color: JP.text },
  block: {
    marginTop: 14,
    backgroundColor: JP.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  blockTitle: { fontSize: 15, fontWeight: '800', color: JP.text, marginBottom: 8 },
  description: { fontSize: 14, color: JP.text, lineHeight: 21 },
  hint: { fontSize: 13, color: JP.muted, lineHeight: 18 },
  qrWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  infoBox: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: JP.brandLight,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 12, color: JP.brandDark, lineHeight: 17, fontWeight: '600' },
  presentBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    padding: 14,
  },
  presentTitle: { fontSize: 15, fontWeight: '800', color: '#067647' },
  presentSub: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: JP.muted },
  error: { color: JP.danger, textAlign: 'center', marginBottom: 8 },
});
