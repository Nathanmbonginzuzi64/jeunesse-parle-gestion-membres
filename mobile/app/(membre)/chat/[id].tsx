import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Image } from 'expo-image';
import { MembrePageHeader } from '@/components/membre/page-header';
import { ChatAttachmentView } from '@/components/membre/chat-attachment';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { chatTitle, type ChatConversationItem } from '@/lib/jp-message';
import {
  dayKey,
  formatDayLabel,
  formatMessageTime,
  toFormFile,
  type ChatMessage,
  type PendingFile,
} from '@/lib/chat-media';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

const CHAT_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🙏', '👏',
  '👍', '❤️', '🔥', '🎉', '💯', '✨', '🙌', '💪',
  '😢', '😮', '🤔', '👀', '✅', '⭐', '🌟', '💙',
  '👋', '🤝', '📝', '📎', '📍', '⏰', '✅', '❗',
];

type ListRow =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: ChatMessage };

export default function MembreChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ListRow>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [canSend, setCanSend] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      const silent = Boolean(opts?.silent);
      try {
        const [thread, meta] = await Promise.all([
          api.get<{
            data: ChatMessage[];
            meta?: { can_send?: boolean };
          }>(`/jp-messages/chats/${id}/messages`),
          api.get<{ data: ChatConversationItem }>(`/jp-messages/chats/${id}`).catch(() => null),
        ]);
        setMessages(thread.data ?? []);
        setCanSend(thread.meta?.can_send !== false);
        if (meta?.data) setConversation(meta.data);
        setError(null);
        void api.post(`/jp-messages/chats/${id}/read`).catch(() => undefined);
      } catch (err) {
        if (!silent) {
          setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useBackgroundRefresh(() => load({ silent: true }), { intervalMs: 4000 });

  useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  const rows = useMemo<ListRow[]>(() => {
    const out: ListRow[] = [];
    let lastDay = '';
    for (const message of messages) {
      const key = dayKey(message.created_at);
      if (key !== lastDay) {
        lastDay = key;
        out.push({
          type: 'day',
          key: `day-${key}`,
          label: formatDayLabel(message.created_at),
        });
      }
      out.push({ type: 'message', key: `m-${message.id}`, message });
    }
    return out;
  }, [messages]);

  async function send(fileOverride?: PendingFile | null) {
    const text = body.trim();
    const attachment = fileOverride ?? pending;
    if ((!text && !attachment) || !id || !canSend) return;

    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      if (text) form.append('body', text);
      if (attachment) {
        form.append('file', toFormFile(attachment));
      }
      const response = await api.post<{ data: ChatMessage }>(
        `/jp-messages/chats/${id}/messages`,
        form,
      );
      if (response.data) {
        setMessages((current) => [...current, response.data]);
      } else {
        await load({ silent: true });
      }
      setBody('');
      setPending(null);
      setEmojiOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  function pickAttachment() {
    Alert.alert('Joindre', 'Choisissez une pièce jointe', [
      {
        text: 'Photo',
        onPress: () => void pickImage('library'),
      },
      {
        text: 'Caméra',
        onPress: () => void pickImage('camera'),
      },
      {
        text: 'Document',
        onPress: () => void pickDocument(),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function pickImage(source: 'library' | 'camera') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission', 'Autorisez l’accès pour joindre une image.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPending({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}.jpg`,
      mime: asset.mimeType || 'image/jpeg',
      kind: 'image',
    });
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'audio/*', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType || 'application/octet-stream';
      const kind = mime.startsWith('image/')
        ? 'image'
        : mime.startsWith('audio/')
          ? 'audio'
          : 'file';
      setPending({
        uri: asset.uri,
        name: asset.name || `fichier-${Date.now()}`,
        mime,
        kind,
      });
    } catch {
      Alert.alert('Document', 'Sélection impossible.');
    }
  }

  async function toggleRecord() {
    if (!canSend) return;
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri) {
          await send({
            uri,
            name: `message-vocal-${Date.now()}.m4a`,
            mime: 'audio/mp4',
            kind: 'audio',
          });
        }
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Micro', 'Autorisez le micro pour envoyer un vocal.');
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      Alert.alert('Vocal', 'Enregistrement indisponible sur cet appareil.');
    }
  }

  const title = conversation ? chatTitle(conversation) : 'Conversation';
  const subtitle =
    conversation?.peer?.role ||
    (recorderState.isRecording ? 'Enregistrement…' : id ? `#${id}` : '');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#E5DDD5' }}>
        <MembrePageHeader
          title="Conversation"
          subtitle="Chargement…"
          icon="chatbubble-ellipses-outline"
          showBack
          showNotifications={false}
        />
        <View style={styles.center}>
          <ActivityIndicator color={JP.brand} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#E5DDD5' }}>
      <MembrePageHeader
        title={title}
        subtitle={subtitle}
        icon="chatbubble-ellipses-outline"
        showBack
        showNotifications={false}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 72}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return (
                <View style={styles.dayWrap}>
                  <Text style={styles.dayText}>{item.label}</Text>
                </View>
              );
            }
            const message = item.message;
            const mine = message.author_id === user?.id;
            return (
              <Pressable
                onLongPress={() => {
                  if (message.body) {
                    void Share.share({ message: message.body });
                  }
                }}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                {!mine && message.author ? (
                  <Text style={styles.author}>{message.author}</Text>
                ) : null}
                {message.body ? (
                  <Text style={[styles.body, mine && { color: '#111B21' }]}>{message.body}</Text>
                ) : null}
                {(message.attachments ?? []).map((file) => (
                  <ChatAttachmentView key={file.id} file={file} inverted={false} />
                ))}
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {formatMessageTime(message.created_at)}
                  {mine ? ' ✓' : ''}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Démarrez la conversation — photos, docs ou vocal.</Text>
          }
        />

        {canSend ? (
          <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {pending ? (
              <View style={styles.pending}>
                {pending.kind === 'image' ? (
                  <Image source={{ uri: pending.uri }} style={styles.pendingImage} />
                ) : (
                  <View style={styles.pendingFile}>
                    <Ionicons
                      name={pending.kind === 'audio' ? 'mic' : 'document-text'}
                      size={18}
                      color={JP.brand}
                    />
                    <Text style={styles.pendingName} numberOfLines={1}>
                      {pending.name}
                    </Text>
                  </View>
                )}
                <Pressable onPress={() => setPending(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={JP.danger} />
                </Pressable>
              </View>
            ) : null}

            {recorderState.isRecording ? (
              <Text style={styles.recording}>Enregistrement vocal… appuyez sur ■ pour envoyer</Text>
            ) : null}

            {emojiOpen ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
              >
                {CHAT_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setBody((current) => `${current}${emoji}`)}
                    style={styles.emojiItem}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.composer}>
              <Pressable
                onPress={() => setEmojiOpen((v) => !v)}
                style={styles.iconBtn}
                accessibilityLabel="Emojis"
              >
                <Ionicons
                  name={emojiOpen ? 'happy' : 'happy-outline'}
                  size={24}
                  color={emojiOpen ? JP.brand : JP.muted}
                />
              </Pressable>
              <Pressable
                onPress={pickAttachment}
                style={styles.iconBtn}
                accessibilityLabel="Joindre"
              >
                <Ionicons name="attach" size={24} color={JP.muted} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Message"
                placeholderTextColor={JP.muted}
                value={body}
                onChangeText={setBody}
                multiline
                onFocus={() => setEmojiOpen(false)}
              />
              {body.trim() || pending ? (
                <Pressable
                  onPress={() => void send()}
                  disabled={sending}
                  style={[styles.send, sending && { opacity: 0.5 }]}
                >
                  <Ionicons name="send" size={18} color={JP.white} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void toggleRecord()}
                  style={[
                    styles.send,
                    recorderState.isRecording && { backgroundColor: JP.danger },
                  ]}
                  accessibilityLabel={
                    recorderState.isRecording ? 'Arrêter et envoyer' : 'Message vocal'
                  }
                >
                  <Ionicons
                    name={recorderState.isRecording ? 'stop' : 'mic'}
                    size={20}
                    color={JP.white}
                  />
                </Pressable>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.readonly}>
            <Text style={styles.readonlyText}>Lecture seule</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: {
    color: JP.danger,
    padding: 10,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#FEE2E2',
  },
  dayWrap: { alignItems: 'center', marginVertical: 10 },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    color: JP.muted,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: JP.white,
    borderTopLeftRadius: 4,
  },
  author: { fontSize: 11, fontWeight: '800', color: JP.brand, marginBottom: 3 },
  body: { fontSize: 15, color: '#111B21', lineHeight: 21 },
  time: {
    marginTop: 4,
    fontSize: 10,
    color: JP.muted,
    alignSelf: 'flex-end',
  },
  timeMine: { color: '#667781' },
  empty: { textAlign: 'center', color: JP.muted, marginTop: 48, paddingHorizontal: 24 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
    backgroundColor: '#F0F2F5',
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: JP.white,
    borderRadius: 12,
    padding: 8,
    marginBottom: 6,
  },
  pendingImage: { width: 56, height: 56, borderRadius: 8 },
  pendingFile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingName: { flex: 1, fontSize: 12, fontWeight: '700', color: JP.text },
  recording: {
    color: JP.danger,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  emojiRow: { gap: 4, paddingVertical: 6, paddingHorizontal: 2 },
  emojiItem: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: JP.white,
  },
  emojiText: { fontSize: 22 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: JP.white,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: JP.text,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  readonly: {
    padding: 14,
    backgroundColor: JP.white,
    borderTopWidth: 1,
    borderTopColor: JP.border,
  },
  readonlyText: { textAlign: 'center', color: JP.muted, fontSize: 12, fontWeight: '600' },
});
