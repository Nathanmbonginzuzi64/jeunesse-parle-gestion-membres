import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import { AuthenticatedImage } from '@/components/authenticated-image';
import { TextBackgroundBanner } from '@/components/membre/text-background-banner';
import { getToken, resolveMediaUrl } from '@/lib/api';
import { downloadNewsMedia } from '@/lib/news-download';
import { hasTextBackground } from '@/lib/text-backgrounds';
import { JP } from '@/constants/theme';

export type NewsMediaFields = {
  body?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  gallery_urls?: string[] | null;
  external_url?: string | null;
  text_background?: string | Record<string, unknown> | null;
  title?: string | null;
};

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function normalizeType(type?: string | null) {
  const value = (type ?? 'text').toLowerCase();
  if (['image', 'photo', 'img'].includes(value)) return 'image';
  if (['video', 'mp4', 'film'].includes(value)) return 'video';
  if (['gallery', 'album'].includes(value)) return 'gallery';
  if (['pdf', 'document', 'file', 'doc', 'docx'].includes(value)) return 'pdf';
  if (['link', 'url', 'external'].includes(value)) return 'link';
  return 'text';
}

function formatTime(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function authHeaders(token: string | null) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Client-Portal': 'mobile',
  };
}

export function NewsMediaBlock({
  item,
  compact = false,
  style,
}: {
  item: NewsMediaFields;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const type = normalizeType(item.media_type);
  const mediaUri = resolveMediaUrl(item.media_url);
  const gallery = (item.gallery_urls ?? [])
    .map((url) => resolveMediaUrl(url))
    .filter(Boolean) as string[];
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    void getToken().then(setToken);
  }, []);

  if (type === 'image' && mediaUri) {
    return (
      <View style={[styles.mediaWrap, compact && styles.mediaCompact, style]}>
        <AuthenticatedImage uri={mediaUri} style={compact ? styles.imageCompact : styles.image} />
      </View>
    );
  }

  if (type === 'gallery' && gallery.length > 0) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.galleryRow}
        style={style}
      >
        {gallery.map((uri) => (
          <AuthenticatedImage key={uri} uri={uri} style={styles.galleryItem} />
        ))}
      </ScrollView>
    );
  }

  if (type === 'video' && mediaUri) {
    return (
      <NewsVideoPlayer
        uri={mediaUri}
        token={token}
        compact={compact}
        style={style}
        title={item.title}
      />
    );
  }

  if (type === 'pdf' && mediaUri) {
    return (
      <NewsDocumentCard
        uri={mediaUri}
        compact={compact}
        style={style}
        title={item.title}
        mediaType={item.media_type}
      />
    );
  }

  if (type === 'link' && item.external_url) {
    return (
      <Pressable
        style={[styles.fileCard, style]}
        onPress={() => {
          void Linking.openURL(String(item.external_url));
        }}
      >
        <Ionicons name="link-outline" size={22} color={JP.brand} />
        <Text style={styles.fileText} numberOfLines={1}>
          {item.external_url}
        </Text>
        <Ionicons name="open-outline" size={16} color={JP.muted} />
      </Pressable>
    );
  }

  if (type === 'text' && hasTextBackground(item.media_type, item.text_background)) {
    return (
      <TextBackgroundBanner
        backgroundId={item.text_background}
        title={item.title}
        body={item.body}
        compact={compact}
        style={style}
      />
    );
  }

  if (item.body && type === 'text') {
    return (
      <View style={[styles.textCard, compact && styles.textCompact, style]}>
        <Text
          style={[styles.textBody, compact && styles.textBodyCompact]}
          numberOfLines={compact ? 4 : undefined}
        >
          {item.body}
        </Text>
      </View>
    );
  }

  return null;
}

function NewsVideoPlayer({
  uri,
  token,
  compact,
  style,
  title,
}: {
  uri: string;
  token: string | null;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string | null;
}) {
  const viewRef = useRef<VideoView>(null);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [trackWidth, setTrackWidth] = useState(1);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const source = useMemo<VideoSource>(
    () => ({
      uri,
      headers: authHeaders(token),
    }),
    [uri, token],
  );

  const player = useVideoPlayer(source, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.25;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const isLoaded = status === 'readyToPlay';
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;

  useEffect(() => {
    const playingSub = player.addListener('timeUpdate', (payload) => {
      setPosition(payload.currentTime ?? 0);
      if (player.duration > 0) setDuration(player.duration);
    });
    const sourceSub = player.addListener('sourceLoad', () => {
      if (player.duration > 0) setDuration(player.duration);
    });
    const statusSub = player.addListener('statusChange', ({ status: next }) => {
      if (next === 'readyToPlay' && player.duration > 0) {
        setDuration(player.duration);
      }
    });
    return () => {
      playingSub.remove();
      sourceSub.remove();
      statusSub.remove();
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const seekTo = useCallback(
    (ratio: number) => {
      if (duration <= 0) return;
      player.currentTime = Math.max(0, Math.min(duration, duration * ratio));
    },
    [player, duration],
  );

  const cycleRate = useCallback(() => {
    const idx = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length] ?? 1;
    setRate(next);
    player.playbackRate = next;
  }, [player, rate]);

  const setPlaybackRate = useCallback(
    (next: number) => {
      setRate(next);
      setShowRates(false);
      player.playbackRate = next;
    },
    [player],
  );

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    player.muted = next;
  }, [player, muted]);

  const toggleFullscreen = useCallback(async () => {
    try {
      await viewRef.current?.enterFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  async function download() {
    setBusy(true);
    try {
      await downloadNewsMedia({
        mediaUrl: uri,
        mediaType: 'video',
        title: title || 'video',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.mediaWrap, compact && styles.mediaCompact, style]}>
      <View style={[styles.videoShell, compact && styles.videoShellCompact]}>
        <Pressable onPress={togglePlay} style={styles.videoTap}>
          <VideoView
            ref={viewRef}
            player={player}
            style={compact ? styles.videoCompactPlayer : styles.video}
            contentFit="contain"
            nativeControls={false}
            fullscreenOptions={{ enable: true }}
          />
          {!isPlaying && isLoaded ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <Ionicons
                name="play-circle"
                size={compact ? 48 : 64}
                color="rgba(255,255,255,0.92)"
              />
            </View>
          ) : null}
          {!isLoaded ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <ActivityIndicator color={JP.white} />
            </View>
          ) : null}
        </Pressable>

        {showRates ? (
          <View style={styles.ratePicker}>
            {PLAYBACK_RATES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setPlaybackRate(value)}
                style={[styles.rateOption, rate === value && styles.rateOptionOn]}
              >
                <Text
                  style={[styles.rateOptionText, rate === value && styles.rateOptionTextOn]}
                >
                  {value}x
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable onPress={togglePlay} style={styles.controlBtn} hitSlop={8}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={JP.white} />
          </Pressable>

          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>

          <Pressable
            style={styles.seekTrack}
            onLayout={(e) => setTrackWidth(Math.max(1, e.nativeEvent.layout.width))}
            onPress={(e) => {
              seekTo(e.nativeEvent.locationX / trackWidth);
            }}
          >
            <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
            <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
          </Pressable>

          <Pressable
            onPress={() => setShowRates((v) => !v)}
            style={styles.rateBtn}
            hitSlop={6}
          >
            <Text style={styles.rateText}>{rate === 1 ? '1x' : `${rate}x`}</Text>
          </Pressable>

          <Pressable onPress={toggleMute} style={styles.controlBtn} hitSlop={8}>
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={18}
              color={JP.white}
            />
          </Pressable>

          <Pressable
            onPress={() => void toggleFullscreen()}
            style={styles.controlBtn}
            hitSlop={8}
          >
            <Ionicons name="expand" size={18} color={JP.white} />
          </Pressable>
        </View>

        <View style={styles.videoActions}>
          <Pressable style={styles.videoActionBtn} onPress={cycleRate} disabled={busy}>
            <Ionicons name="speedometer-outline" size={16} color={JP.white} />
            <Text style={styles.videoActionText}>Vitesse {rate}x</Text>
          </Pressable>
          <Pressable
            style={styles.videoActionBtn}
            onPress={() => void download()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={JP.white} />
            ) : (
              <>
                <Ionicons name="download-outline" size={16} color={JP.white} />
                <Text style={styles.videoActionText}>Télécharger</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NewsDocumentCard({
  uri,
  compact,
  style,
  title,
  mediaType,
}: {
  uri: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  title?: string | null;
  mediaType?: string | null;
}) {
  const [busy, setBusy] = useState<'open' | 'download' | null>(null);
  const isPdf = String(mediaType ?? 'pdf').toLowerCase().includes('pdf') || uri.includes('.pdf');

  async function openDocument() {
    setBusy('open');
    try {
      // Télécharge avec auth puis ouvre via la feuille native (liseuse / fichiers).
      await downloadNewsMedia({
        mediaUrl: uri,
        mediaType: mediaType || 'pdf',
        title: title || 'document',
      });
    } catch {
      try {
        await WebBrowser.openBrowserAsync(uri);
      } catch {
        Alert.alert('Document', 'Impossible d’ouvrir ce fichier.');
      }
    } finally {
      setBusy(null);
    }
  }

  async function downloadOnly() {
    setBusy('download');
    try {
      await downloadNewsMedia({
        mediaUrl: uri,
        mediaType: mediaType || 'pdf',
        title: title || 'document',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.docCard, compact && styles.docCardCompact, style]}>
      <View style={styles.docIcon}>
        <Ionicons
          name={isPdf ? 'document-text' : 'document'}
          size={26}
          color={JP.brand}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {isPdf ? 'Document PDF' : 'Fichier joint'}
        </Text>
        <Text style={styles.docSub} numberOfLines={1}>
          {title || 'Appuyez pour ouvrir ou télécharger'}
        </Text>
      </View>
      <View style={styles.docActions}>
        <Pressable
          style={styles.docBtn}
          onPress={() => void openDocument()}
          disabled={busy !== null}
        >
          {busy === 'open' ? (
            <ActivityIndicator size="small" color={JP.brand} />
          ) : (
            <Ionicons name="eye-outline" size={18} color={JP.brand} />
          )}
        </Pressable>
        <Pressable
          style={styles.docBtn}
          onPress={() => void downloadOnly()}
          disabled={busy !== null}
        >
          {busy === 'download' ? (
            <ActivityIndicator size="small" color={JP.brand} />
          ) : (
            <Ionicons name="download-outline" size={18} color={JP.brand} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0B1F33',
  },
  mediaCompact: { borderRadius: 12 },
  image: { width: '100%', height: 220 },
  imageCompact: { width: '100%', height: 140 },
  galleryRow: { gap: 8, paddingVertical: 2 },
  galleryItem: { width: 160, height: 120, borderRadius: 12 },
  videoShell: { backgroundColor: '#000' },
  videoShellCompact: {},
  videoTap: { position: 'relative' },
  video: { width: '100%', height: 240, backgroundColor: '#000' },
  videoCompactPlayer: { width: '100%', height: 180, backgroundColor: '#000' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  controlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', minWidth: 78 },
  seekTrack: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
  },
  seekFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: JP.brand,
  },
  seekThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    backgroundColor: JP.white,
  },
  rateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  rateText: { color: JP.white, fontSize: 11, fontWeight: '800' },
  ratePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  rateOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  rateOptionOn: { backgroundColor: JP.brand },
  rateOptionText: { color: JP.white, fontSize: 12, fontWeight: '700' },
  rateOptionTextOn: { color: JP.white },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  videoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  videoActionText: { color: JP.white, fontSize: 12, fontWeight: '700' },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: JP.brandLight,
    borderRadius: 12,
    padding: 12,
  },
  fileText: { flex: 1, fontSize: 13, fontWeight: '700', color: JP.brandDark },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
  },
  docCardCompact: { borderRadius: 12 },
  docIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 14, fontWeight: '800', color: JP.text },
  docSub: { marginTop: 2, fontSize: 12, color: JP.muted, fontWeight: '600' },
  docActions: { flexDirection: 'row', gap: 6 },
  docBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: JP.brandLight,
  },
  textCompact: { padding: 12, borderRadius: 12 },
  textBody: { fontSize: 15, lineHeight: 22, color: JP.text, fontWeight: '600' },
  textBodyCompact: { fontSize: 13, lineHeight: 18 },
});
