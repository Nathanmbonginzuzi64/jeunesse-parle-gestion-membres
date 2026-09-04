import { useEffect, useState } from 'react';
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
import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as Sharing from 'expo-sharing';
import {
  cacheProtectedUri,
  type ChatAttachment,
} from '@/lib/chat-media';
import { JP } from '@/constants/theme';

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
    return (
      <Image
        source={{ uri: localUri }}
        style={styles.image}
        contentFit="cover"
      />
    );
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
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  return (
    <Pressable
      style={[styles.audioBtn, inverted && styles.audioBtnInv]}
      onPress={() => {
        if (playing) player.pause();
        else {
          if (status.currentTime > 0 && status.currentTime >= (status.duration ?? 0) - 0.2) {
            player.seekTo(0);
          }
          player.play();
        }
      }}
    >
      <Ionicons
        name={playing ? 'pause' : 'play'}
        size={18}
        color={inverted ? JP.white : JP.brand}
      />
      <Text style={[styles.audioLabel, inverted && { color: JP.white }]}>
        Message vocal
      </Text>
    </Pressable>
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
  audioBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,135,209,0.1)',
    minWidth: 150,
  },
  audioBtnInv: { backgroundColor: 'rgba(255,255,255,0.18)' },
  audioLabel: { fontSize: 13, fontWeight: '700', color: JP.brandDark },
});
