import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { BigButton, Screen } from '@/components/ui';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { MemberQrCode } from '@/components/membre/member-qr-code';
import { MembrePageHeader } from '@/components/membre/page-header';
import { openNativeDirections } from '@/lib/activity-navigation';
import {
  isActivityVoiceEnabled,
  maybeAnnounceActivityStart,
  maybeAnnounceMemberPosition,
  setActivityVoiceEnabled,
  speakActivity,
} from '@/lib/activity-voice';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type LiveLocation = {
  active?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  updated_at?: string | null;
  shared_by?: string | null;
};

type ActivityDetail = {
  id: number;
  title: string;
  code?: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  live_location?: LiveLocation | null;
  member_location_sharing?: boolean;
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
  const [sharing, setSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);

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
      if (data?.member_location_sharing != null) {
        setSharing(Boolean(data.member_location_sharing));
      }
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

  const pollLive = useCallback(async () => {
    if (!id) return;
    try {
      const snap = await api.get<{
        live: LiveLocation;
        member_location_sharing?: boolean;
        venue?: { latitude?: number | null; longitude?: number | null; location?: string | null };
      }>(`/activities/${id}/live-location/for-member`);
      setItem((current) =>
        current
          ? {
              ...current,
              live_location: snap.live,
              latitude: snap.venue?.latitude ?? current.latitude,
              longitude: snap.venue?.longitude ?? current.longitude,
              member_location_sharing: snap.member_location_sharing,
            }
          : current,
      );
      if (snap.member_location_sharing != null) {
        setSharing(Boolean(snap.member_location_sharing));
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      void isActivityVoiceEnabled().then(setVoiceOn);
      return () => {
        watchRef.current?.remove();
        watchRef.current = null;
      };
    }, [load]),
  );

  useBackgroundRefresh(() => load({ silent: true }));

  useEffect(() => {
    if (!item) return;
    void maybeAnnounceActivityStart({
      activityId: item.id,
      title: item.title,
      startsAt: item.starts_at,
      locationLabel: item.location,
    });
  }, [item?.id, item?.starts_at, item?.title, item?.location]);

  useEffect(() => {
    if (!item) return;
    const timer = setInterval(() => {
      void pollLive();
    }, 4_000);
    return () => clearInterval(timer);
  }, [item?.id, pollLive]);

  useEffect(() => {
    if (!sharing) {
      watchRef.current?.remove();
      watchRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoError('Permission de localisation refusée.');
        setSharing(false);
        return;
      }
      setGeoError(null);

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4_000,
          distanceInterval: 15,
        },
        (pos) => {
          if (cancelled || !id) return;
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setMyCoords(coords);
          void api
            .post(`/activities/${id}/member-location/update`, coords)
            .catch(() => undefined);
          void maybeAnnounceMemberPosition(coords.latitude, coords.longitude);
        },
      );
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [sharing, id]);

  const venueLat = item?.latitude ?? null;
  const venueLng = item?.longitude ?? null;
  const liveActive = Boolean(item?.live_location?.active);
  const liveLat = item?.live_location?.latitude ?? null;
  const liveLng = item?.live_location?.longitude ?? null;

  const destination =
    liveActive && liveLat != null && liveLng != null
      ? { latitude: liveLat, longitude: liveLng, label: item?.live_location?.shared_by ?? 'Organisateur' }
      : venueLat != null && venueLng != null
        ? { latitude: venueLat, longitude: venueLng, label: item?.location ?? item?.title }
        : null;

  const mapCoords = [
    venueLat != null && venueLng != null ? { latitude: venueLat, longitude: venueLng } : null,
    liveActive && liveLat != null && liveLng != null
      ? { latitude: liveLat, longitude: liveLng }
      : null,
    myCoords,
  ].filter(Boolean) as Array<{ latitude: number; longitude: number }>;

  const region =
    mapCoords.length > 0
      ? {
          latitude: mapCoords.reduce((s, c) => s + c.latitude, 0) / mapCoords.length,
          longitude: mapCoords.reduce((s, c) => s + c.longitude, 0) / mapCoords.length,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : {
          latitude: -4.3217,
          longitude: 15.3125,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        };

  async function startSharing() {
    if (!item?.is_registered) {
      setGeoError('Inscrivez-vous à l’activité pour partager votre position.');
      return;
    }
    setShareBusy(true);
    setGeoError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoError('Permission de localisation refusée.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      await api.post(`/activities/${id}/member-location/start`, coords);
      setMyCoords(coords);
      setSharing(true);
      await speakActivity(
        'Votre position est maintenant partagée. Les organisateurs peuvent vous voir en route.',
      );
    } catch (caught) {
      setGeoError(caught instanceof ApiError ? caught.message : 'Impossible d’activer le partage.');
    } finally {
      setShareBusy(false);
    }
  }

  async function stopSharing() {
    setShareBusy(true);
    try {
      await api.post(`/activities/${id}/member-location/stop`);
      setSharing(false);
    } catch (caught) {
      setGeoError(caught instanceof ApiError ? caught.message : 'Arrêt impossible.');
    } finally {
      setShareBusy(false);
    }
  }

  async function toggleVoice(next: boolean) {
    setVoiceOn(next);
    await setActivityVoiceEnabled(next);
    if (next) {
      await speakActivity('Voix activée pour les informations d’activité.');
    }
  }

  const present = item?.attendance?.status === 'present';
  const hasMap = mapCoords.length > 0;

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

            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockTitle}>Carte & itinéraire</Text>
                <View style={styles.voiceRow}>
                  <Text style={styles.voiceLabel}>Voix</Text>
                  <Switch
                    value={voiceOn}
                    onValueChange={(v) => void toggleVoice(v)}
                    trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                    thumbColor={voiceOn ? JP.brand : '#f4f4f5'}
                  />
                </View>
              </View>

              {liveActive ? (
                <View style={styles.liveBanner}>
                  <Ionicons name="radio" size={16} color={JP.brand} />
                  <Text style={styles.liveText}>
                    Position organisateur en direct
                    {item.live_location?.shared_by ? ` · ${item.live_location.shared_by}` : ''}
                  </Text>
                </View>
              ) : null}

              {hasMap ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={region}
                  showsUserLocation={sharing}
                  showsMyLocationButton={false}
                >
                  {venueLat != null && venueLng != null ? (
                    <Marker
                      coordinate={{ latitude: venueLat, longitude: venueLng }}
                      title="Lieu de l’activité"
                      pinColor="#ef4444"
                    />
                  ) : null}
                  {liveActive && liveLat != null && liveLng != null ? (
                    <Marker
                      coordinate={{ latitude: liveLat, longitude: liveLng }}
                      title="Organisateur"
                      description={item.live_location?.shared_by ?? undefined}
                      pinColor="#0087d1"
                    />
                  ) : null}
                  {myCoords ? (
                    <Marker
                      coordinate={myCoords}
                      title="Ma position"
                      pinColor="#10b981"
                    />
                  ) : null}
                </MapView>
              ) : (
                <Text style={styles.hint}>
                  Aucune coordonnée GPS pour cette activité. Dès que l’organisateur partage sa
                  position ou que le lieu a des coordonnées, la carte s’affiche ici.
                </Text>
              )}

              {geoError ? <Text style={styles.errorInline}>{geoError}</Text> : null}

              <View style={styles.actionsCol}>
                {destination ? (
                  <BigButton
                    label="Démarrer l’itinéraire"
                    onPress={() =>
                      void openNativeDirections(
                        destination.latitude,
                        destination.longitude,
                        destination.label,
                      )
                    }
                  />
                ) : null}

                {item.is_registered ? (
                  sharing ? (
                    <Pressable
                      onPress={() => void stopSharing()}
                      disabled={shareBusy}
                      style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                    >
                      <Ionicons name="navigate" size={18} color={JP.danger} />
                      <Text style={[styles.secondaryBtnText, { color: JP.danger }]}>
                        {shareBusy ? 'Arrêt…' : 'Arrêter mon partage GPS'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => void startSharing()}
                      disabled={shareBusy}
                      style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                    >
                      <Ionicons name="navigate-circle" size={18} color={JP.brand} />
                      <Text style={styles.secondaryBtnText}>
                        {shareBusy ? 'Activation…' : 'Activer ma position (en route)'}
                      </Text>
                    </Pressable>
                  )
                ) : (
                  <Text style={styles.hint}>
                    Inscrivez-vous pour partager votre position avec les organisateurs.
                  </Text>
                )}
              </View>
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
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  blockTitle: { fontSize: 15, fontWeight: '800', color: JP.text },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voiceLabel: { fontSize: 12, fontWeight: '700', color: JP.muted },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: JP.brandLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  liveText: { flex: 1, fontSize: 12, fontWeight: '700', color: JP.brandDark },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionsCol: { gap: 10 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: JP.border,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '800', color: JP.brand },
  description: { fontSize: 14, color: JP.text, lineHeight: 21 },
  hint: { fontSize: 13, color: JP.muted, lineHeight: 18 },
  errorInline: { color: JP.danger, fontSize: 12, fontWeight: '600', marginBottom: 8 },
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
