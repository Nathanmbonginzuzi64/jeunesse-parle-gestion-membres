import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';
import { api } from '@/lib/api';
import { isActivityVoiceEnabled } from '@/lib/activity-voice';

export const MEMBER_LOCATION_TASK = 'jp-member-en-route-location';

const CTX_ACTIVITY = 'jp.bg.member.activityId';
const CTX_DEST_LAT = 'jp.bg.member.destLat';
const CTX_DEST_LNG = 'jp.bg.member.destLng';
const CTX_DEST_LABEL = 'jp.bg.member.destLabel';
const CTX_LAST_VOICE = 'jp.bg.member.lastVoiceAt';

type BgCtx = {
  activityId: string;
  destLat: number | null;
  destLng: number | null;
  destLabel: string | null;
};

async function readCtx(): Promise<BgCtx | null> {
  const activityId = await SecureStore.getItemAsync(CTX_ACTIVITY);
  if (!activityId) return null;
  const destLatRaw = await SecureStore.getItemAsync(CTX_DEST_LAT);
  const destLngRaw = await SecureStore.getItemAsync(CTX_DEST_LNG);
  const destLabel = await SecureStore.getItemAsync(CTX_DEST_LABEL);
  return {
    activityId,
    destLat: destLatRaw != null ? Number(destLatRaw) : null,
    destLng: destLngRaw != null ? Number(destLngRaw) : null,
    destLabel,
  };
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function maybeSpeakBackground(text: string, minIntervalMs = 90_000): Promise<void> {
  const enabled = await isActivityVoiceEnabled();
  if (!enabled || !text.trim()) return;
  const lastRaw = await SecureStore.getItemAsync(CTX_LAST_VOICE);
  const last = lastRaw ? Number(lastRaw) : 0;
  if (Date.now() - last < minIntervalMs) return;
  await SecureStore.setItemAsync(CTX_LAST_VOICE, String(Date.now()));
  try {
    Speech.stop();
    Speech.speak(text, { language: 'fr-FR', rate: 0.95, pitch: 1 });
  } catch {
    /* TTS indisponible en arrière-plan sur certains OS */
  }
}

TaskManager.defineTask(MEMBER_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const ctx = await readCtx();
  if (!ctx) return;

  const coords = {
    latitude: latest.coords.latitude,
    longitude: latest.coords.longitude,
  };

  try {
    const res = await api.post<{
      data?: { sharing_active?: boolean; arrived?: boolean };
      message?: string;
    }>(`/activities/${ctx.activityId}/member-location/update`, coords);

    if (res.data?.arrived) {
      await maybeSpeakBackground(
        `Vous êtes arrivé${ctx.destLabel ? ` à ${ctx.destLabel}` : ''}. Bienvenue à l'activité.`,
        0,
      );
      await stopBackgroundMemberTracking();
      return;
    }
  } catch {
    return;
  }

  if (ctx.destLat != null && ctx.destLng != null && !Number.isNaN(ctx.destLat) && !Number.isNaN(ctx.destLng)) {
    const meters = haversineMeters(coords.latitude, coords.longitude, ctx.destLat, ctx.destLng);
    if (meters > 150) {
      const km = meters >= 1000 ? `${(meters / 1000).toFixed(1)} kilomètres` : `${Math.round(meters)} mètres`;
      await maybeSpeakBackground(
        `Vous êtes toujours en route vers ${ctx.destLabel || "l'activité"}. Distance restante approximative : ${km}.`,
      );
    }
  } else {
    await maybeSpeakBackground('Votre position est toujours partagée. Vous êtes en route.');
  }
});

export async function startBackgroundMemberTracking(opts: {
  activityId: number | string;
  destLat?: number | null;
  destLng?: number | null;
  destLabel?: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    return { ok: false, message: 'Permission de localisation refusée.' };
  }

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') {
    return {
      ok: false,
      message:
        'Autorisez la localisation « Toujours » pour continuer le suivi et la voix si vous fermez l’application.',
    };
  }

  await SecureStore.setItemAsync(CTX_ACTIVITY, String(opts.activityId));
  if (opts.destLat != null) {
    await SecureStore.setItemAsync(CTX_DEST_LAT, String(opts.destLat));
  } else {
    await SecureStore.deleteItemAsync(CTX_DEST_LAT);
  }
  if (opts.destLng != null) {
    await SecureStore.setItemAsync(CTX_DEST_LNG, String(opts.destLng));
  } else {
    await SecureStore.deleteItemAsync(CTX_DEST_LNG);
  }
  if (opts.destLabel) {
    await SecureStore.setItemAsync(CTX_DEST_LABEL, opts.destLabel);
  } else {
    await SecureStore.deleteItemAsync(CTX_DEST_LABEL);
  }

  const started = await Location.hasStartedLocationUpdatesAsync(MEMBER_LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(MEMBER_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(MEMBER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 8_000,
    distanceInterval: 25,
    deferredUpdatesInterval: 8_000,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Jeunesse Parle — En route',
      notificationBody: 'Suivi de votre itinéraire vers l’activité',
      notificationColor: '#0087D1',
    },
  });

  return { ok: true };
}

export async function stopBackgroundMemberTracking(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(MEMBER_LOCATION_TASK);
    if (started) {
      await Location.stopLocationUpdatesAsync(MEMBER_LOCATION_TASK);
    }
  } catch {
    /* ignore */
  }
  await SecureStore.deleteItemAsync(CTX_ACTIVITY);
  await SecureStore.deleteItemAsync(CTX_DEST_LAT);
  await SecureStore.deleteItemAsync(CTX_DEST_LNG);
  await SecureStore.deleteItemAsync(CTX_DEST_LABEL);
  await SecureStore.deleteItemAsync(CTX_LAST_VOICE);
}

export async function isBackgroundMemberTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(MEMBER_LOCATION_TASK);
  } catch {
    return false;
  }
}
