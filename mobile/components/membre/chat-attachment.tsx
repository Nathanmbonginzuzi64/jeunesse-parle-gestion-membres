import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { cacheProtectedUri, type ChatAttachment } from '@/lib/chat-media';
import { JP } from '@/constants/theme';

const SPEED_STEPS = [1, 1.5, 2] as const;

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ChatAttachmentView({
  file,
  inverted = false,
}: {
  file: ChatAttachment;
  inverted?: boolean;
}) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const uri = await cacheProtectedUri(file.url, `${file.id}-${file.name}`);
      if (!cancelled) {
        setLocalUri(uri);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.id, file.name, file.url]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={inverted ? JP.white : JP.brand} size="small" />
      </View>
    );
  }

  if (file.kind === 'image' && localUri) {
    return <Image source={{ uri: localUri }} style={styles.image} contentFit="cover" />;
  }

  if (file.kind === 'audio' && localUri) {
    return <ChatAudioPlayer uri={localUri} inverted={inverted} />;
  }

  return (
    <Pressable
      style={[styles.fileBtn, inverted && styles.fileBtnInv]}
      onPress={() => void openOrShare(localUri, file.name)}
    >
      <Ionicons
        name="document-text-outline"
        size={18}
        color={inverted ? JP.white : JP.brand}
      />
      <Text style={[styles.fileName, inverted && { color: JP.white }]} numberOfLines={2}>
        {file.name}
      </Text>
    </Pressable>
  );
}

function ChatAudioPlayer({ uri, inverted }: { uri: string; inverted: boolean }) {
  const player = useAudioPlayer({ uri }, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(160);
  const speed = SPEED_STEPS[speedIndex] ?? 1;
  const playing = status.playing;
  const duration = Math.max(0, status.duration || 0);
  const current = Math.max(0, Math.min(status.currentTime || 0, duration || status.currentTime || 0));
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  const waveHeights = useMemo(
    () => [4, 10, 7, 14, 9, 16, 8, 12, 6, 15, 9, 11, 5, 13, 8, 10, 7, 14, 6, 12, 9, 15, 5, 11],
    [],
  );

  useEffect(() => {
    player.setPlaybackRate(speed, 'medium');
  }, [player, speed]);

  function togglePlay() {
    if (playing) {
      player.pause();
      return;
    }
    if (duration > 0 && current >= duration - 0.25) {
      void player.seekTo(0).then(() => player.play());
      return;
    }
    player.play();
  }

  function cycleSpeed() {
    setSpeedIndex((index) => (index + 1) % SPEED_STEPS.length);
  }

  function seekAt(locationX: number) {
    if (duration <= 0 || trackWidth <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    void player.seekTo(ratio * duration);
  }

  const accent = inverted ? JP.white : JP.brand;
  const soft = inverted ? 'rgba(255,255,255,0.22)' : 'rgba(0,135,209,0.14)';
  const muted = inverted ? 'rgba(255,255,255,0.75)' : JP.muted;

  return (
    <View style={[styles.audioCard, inverted && styles.audioCardInv]}>
      <Pressable
        onPress={togglePlay}
        style={[styles.audioPlay, { backgroundColor: soft }]}
        accessibilityLabel={playing ? 'Pause' : 'Lire le message vocal'}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={20} color={accent} />
      </Pressable>

      <View style={styles.audioMain}>
        <Pressable
          style={styles.waveTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onPress={(event) => seekAt(event.nativeEvent.locationX)}
        >
          <View style={styles.waveRow}>
            {waveHeights.map((height, index) => {
              const active = index / waveHeights.length <= progress;
              return (
                <View
                  key={`w-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height,
                      backgroundColor: active ? accent : soft,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View
            style={[
              styles.progressLine,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: accent },
            ]}
          />
        </Pressable>

        <View style={styles.audioMeta}>
          <Text style={[styles.audioTime, { color: muted }]}>
            {formatAudioTime(playing || current > 0 ? current : duration)}
          </Text>
          <Pressable
            onPress={cycleSpeed}
            style={[styles.speedChip, { borderColor: soft, backgroundColor: soft }]}
            hitSlop={6}
            accessibilityLabel={`Vitesse ${speed}x`}
          >
            <Text style={[styles.speedText, { color: accent }]}>{`${speed}×`}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.micBadge, { backgroundColor: soft }]}>
        <Ionicons name="mic" size={14} color={accent} />
      </View>
    </View>
  );
}

async function openOrShare(uri: string | null, name: string) {
  if (!uri) {
    Alert.alert('Fichier', 'Impossible d’ouvrir ce fichier.');
    return;
  }
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { dialogTitle: name });
      return;
    }
    await Linking.openURL(uri);
  } catch {
    Alert.alert('Fichier', 'Ouverture impossible.');
  }
}

const styles = StyleSheet.create({
  loadingBox: {
    marginTop: 8,
    height: 48,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    marginTop: 8,
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: '#0B1F3310',
  },
  fileBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 220,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,135,209,0.08)',
  },
  fileBtnInv: { backgroundColor: 'rgba(255,255,255,0.15)' },
  fileName: { flex: 1, fontSize: 12, fontWeight: '700', color: JP.brandDark },
  audioCard: {
    marginTop: 8,
    minWidth: 220,
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(0,135,209,0.08)',
  },
  audioCardInv: { backgroundColor: 'rgba(255,255,255,0.16)' },
  audioPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioMain: { flex: 1, gap: 6 },
  waveTrack: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  progressLine: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    opacity: 0.55,
  },
  audioMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioTime: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  speedChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: 'center',
  },
  speedText: {
    fontSize: 11,
    fontWeight: '800',
  },
  micBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
