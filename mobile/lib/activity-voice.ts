import * as Speech from 'expo-speech';
import * as SecureStore from 'expo-secure-store';

const VOICE_KEY = 'jp.activity.voice.enabled';
const announcedStarts = new Set<string>();
let lastPositionAnnounceAt = 0;

export async function isActivityVoiceEnabled(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(VOICE_KEY);
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

export async function setActivityVoiceEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(VOICE_KEY, enabled ? '1' : '0');
  if (!enabled) {
    Speech.stop();
  }
}

export async function speakActivity(text: string): Promise<void> {
  const enabled = await isActivityVoiceEnabled();
  if (!enabled || !text.trim()) return;
  Speech.stop();
  Speech.speak(text, {
    language: 'fr-FR',
    rate: 0.95,
    pitch: 1,
  });
}

/** Annonce unique autour de starts_at (±2 min) ou si déjà démarrée au focus. */
export async function maybeAnnounceActivityStart(opts: {
  activityId: number | string;
  title: string;
  startsAt?: string | null;
  locationLabel?: string | null;
}): Promise<void> {
  const key = String(opts.activityId);
  if (announcedStarts.has(key)) return;
  if (!opts.startsAt) return;

  const start = new Date(opts.startsAt).getTime();
  if (Number.isNaN(start)) return;

  const now = Date.now();
  const windowMs = 2 * 60 * 1000;
  const startedRecently = now >= start - windowMs && now <= start + 30 * 60 * 1000;
  if (!startedRecently) return;

  announcedStarts.add(key);
  const lieu = opts.locationLabel ? ` Lieu : ${opts.locationLabel}.` : '';
  await speakActivity(
    `Attention. L'activité ${opts.title} commence.${lieu} Activez votre position pour indiquer que vous êtes en route, puis lancez l'itinéraire sur la carte.`,
  );
}

/** Annonce discrète de la position (max 1× / 2 min). */
export async function maybeAnnounceMemberPosition(lat: number, lng: number): Promise<void> {
  const now = Date.now();
  if (now - lastPositionAnnounceAt < 2 * 60 * 1000) return;
  lastPositionAnnounceAt = now;
  await speakActivity(
    `Votre position est partagée avec les organisateurs. Latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)}.`,
  );
}
