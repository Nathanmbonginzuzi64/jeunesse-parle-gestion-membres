import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
  pendingVoiceFromUri,
} from '@/lib/chat-media';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

const CHAT_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🙏', '👏',
  '👍', '❤️', '🔥', '🎉', '💯', '✨', '🙌', '💪',
  '😢', '😮', '🤔', '👀', '✅', '⭐', '🌟', '💙',
  '👋', '🤝', '📝', '📎', '📍', '⏰', '🆗', '❗',
];

function formatRecordingDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type ListRow =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: ChatMessage };

export default function MembreChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ListRow>>(null);
  const inputRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [canSend, setCanSend] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const sendingLock = useRef(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!recorderState.isRecording) {
      setRecordingSeconds(0);
      return;
    }
    setRecordingSeconds(0);
    const startedAt = Date.now();
    const tick = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(tick);
  }, [recorderState.isRecording]);

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
        setMessages((current) => {
          const pendingLocal = current.filter((item) => item.pending);
          const server = thread.data ?? [];
          if (pendingLocal.length === 0) return server;
          // Conserve les envois en cours non encore confirmés par le serveur.
          const serverIds = new Set(server.map((item) => item.id));
          const stillPending = pendingLocal.filter((item) => !serverIds.has(item.id));
          return [...server, ...stillPending];
        });
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
    if (sendingLock.current) return;

    if (editingId) {
      sendingLock.current = true;
      setSending(true);
      setError(null);
      try {
        const response = await api.put<{ data: ChatMessage }>(
          `/jp-messages/chats/${id}/messages/${editingId}`,
          { body: text },
        );
        if (response.data) {
          setMessages((current) =>
            current.map((item) => (item.id === editingId ? response.data : item)),
          );
        } else {
          await load({ silent: true });
        }
        setEditingId(null);
        setBody('');
        setEmojiOpen(false);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
      } finally {
        sendingLock.current = false;
        setSending(false);
      }
      return;
    }

    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      body: text || null,
      author_id: user?.id ?? null,
      author: user?.name ?? 'Moi',
      created_at: new Date().toISOString(),
      type: attachment?.kind === 'audio' ? 'audio' : attachment?.kind === 'image' ? 'image' : 'text',
      pending: true,
      attachments: attachment
        ? [
            {
              id: tempId,
              kind: attachment.kind,
              name: attachment.name,
              url: attachment.uri,
              mime: attachment.mime,
            },
          ]
        : [],
    };

    // Affiche le message tout de suite, sans attendre le réseau.
    setBody('');
    setPending(null);
    setEmojiOpen(false);
    setError(null);
    setMessages((current) => [...current, optimistic]);
    sendingLock.current = true;
    setSending(true);

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
        setMessages((current) =>
          current.map((item) => (item.id === tempId ? response.data : item)),
        );
      } else {
        setMessages((current) => current.filter((item) => item.id !== tempId));
        await load({ silent: true });
      }
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== tempId));
      setBody(text);
      setPending(attachment);
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      sendingLock.current = false;
      setSending(false);
    }
  }

  function startEdit(message: ChatMessage) {
    if (!message.body || message.type === 'deleted') return;
    setEditingId(message.id);
    setBody(message.body);
    setPending(null);
    setEmojiOpen(false);
    inputRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setBody('');
  }

  function confirmDelete(message: ChatMessage) {
    Alert.alert('Supprimer', 'Supprimer ce message pour tout le monde ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => void deleteMessage(message.id),
      },
    ]);
  }

  async function deleteMessage(messageId: number) {
    if (!id) return;
    try {
      await api.delete(`/jp-messages/chats/${id}/messages/${messageId}`);
      setMessages((current) => current.filter((item) => item.id !== messageId));
      if (editingId === messageId) cancelEdit();
    } catch (err) {
      Alert.alert(
        'Suppression',
        err instanceof ApiError ? err.message : 'Impossible de supprimer ce message.',
      );
    }
  }

  function onMessageLongPress(message: ChatMessage, mine: boolean) {
    if (message.pending) return;
    const buttons: {
      text: string;
      style?: 'cancel' | 'destructive' | 'default';
      onPress?: () => void;
    }[] = [];

    if (message.body) {
      buttons.push({
        text: 'Copier',
        onPress: () => {
          void import('expo-clipboard').then((Clipboard) =>
            Clipboard.setStringAsync(message.body || ''),
          );
        },
      });
    }

    if (mine && message.type !== 'deleted') {
      if (message.body) {
        buttons.push({ text: 'Modifier', onPress: () => startEdit(message) });
      }
      buttons.push({
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => confirmDelete(message),
      });
    }

    buttons.push({ text: 'Annuler', style: 'cancel' });
    if (buttons.length <= 1) return;
    Alert.alert('Message', undefined, buttons);
  }

  function pickAttachment() {
    if (editingId) {
      Alert.alert('Modification', 'Terminez ou annulez la modification avant de joindre un fichier.');
      return;
    }
    Alert.alert('Joindre', 'Choisissez une pièce jointe', [
      { text: 'Photo', onPress: () => void pickImage('library') },
      { text: 'Caméra', onPress: () => void pickImage('camera') },
      { text: 'Document', onPress: () => void pickDocument() },
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
    if (!canSend || editingId) return;
    try {
      if (recorderState.isRecording) {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri) {
          await send(pendingVoiceFromUri(uri));
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
    (recorderState.isRecording
      ? `Enregistrement ${formatRecordingDuration(recordingSeconds)}`
      : id
        ? `#${id}`
        : '');

  const composerBottomPad =
    Platform.OS === 'android'
      ? Math.max(keyboardHeight, Math.max(insets.bottom, 8))
      : Math.max(insets.bottom, 8);

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
            const editing = editingId === message.id;
            return (
              <Pressable
                onLongPress={() => onMessageLongPress(message, mine)}
                delayLongPress={280}
                style={[
                  styles.bubble,
                  mine ? styles.mine : styles.theirs,
                  editing && styles.editingBubble,
                ]}
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
                  {message.edited_at ? 'modifié · ' : ''}
                  {formatMessageTime(message.created_at)}
                  {mine ? (message.pending ? ' …' : ' ✓') : ''}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Démarrez la conversation — photos, docs ou vocal.</Text>
          }
        />

        {canSend ? (
          <View style={[styles.composerWrap, { paddingBottom: composerBottomPad }]}>
            {editingId ? (
              <View style={styles.editBanner}>
                <Ionicons name="pencil" size={16} color={JP.brand} />
                <Text style={styles.editBannerText}>Modification du message</Text>
                <Pressable onPress={cancelEdit} hitSlop={8}>
                  <Ionicons name="close" size={18} color={JP.muted} />
                </Pressable>
              </View>
            ) : null}

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
              <View style={styles.recordingBar}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTimer}>{formatRecordingDuration(recordingSeconds)}</Text>
                <Text style={styles.recording}>Enregistrement… appuyez sur ■ pour envoyer</Text>
              </View>
            ) : null}

            {emojiOpen ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.emojiRow}
                keyboardShouldPersistTaps="handled"
              >
                {CHAT_EMOJIS.map((emoji, index) => (
                  <Pressable
                    key={`emoji-${index}-${emoji}`}
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
                ref={inputRef}
                style={styles.input}
                placeholder={editingId ? 'Modifier le message…' : 'Message'}
                placeholderTextColor={JP.muted}
                value={body}
                onChangeText={setBody}
                multiline
                onFocus={() => {
                  setEmojiOpen(false);
                  requestAnimationFrame(() => {
                    listRef.current?.scrollToEnd({ animated: true });
                  });
                }}
              />
              {body.trim() || pending || editingId ? (
                <Pressable
                  onPress={() => void send()}
                  disabled={editingId ? !body.trim() || sending : false}
                  style={[styles.send, sending && editingId && { opacity: 0.5 }]}
                >
                  <Ionicons name={editingId ? 'checkmark' : 'send'} size={18} color={JP.white} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void toggleRecord()}
                  style={[
                    styles.send,
                    recorderState.isRecording && styles.sendRecording,
                  ]}
                  accessibilityLabel={
                    recorderState.isRecording
                      ? `Arrêter et envoyer (${formatRecordingDuration(recordingSeconds)})`
                      : 'Message vocal'
                  }
                >
                  {recorderState.isRecording ? (
                    <View style={styles.sendRecordingInner}>
                      <Ionicons name="stop" size={14} color={JP.white} />
                      <Text style={styles.sendRecordingLabel}>
                        {formatRecordingDuration(recordingSeconds)}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons name="mic" size={20} color={JP.white} />
                  )}
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
  editingBubble: {
    borderWidth: 1.5,
    borderColor: JP.brand,
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
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: JP.brandLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  editBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: JP.brandDark },
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
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: JP.danger,
  },
  recordingTimer: {
    minWidth: 48,
    color: JP.danger,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  recording: {
    flex: 1,
    color: JP.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  sendRecording: {
    backgroundColor: JP.danger,
    minWidth: 64,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 10,
  },
  sendRecordingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  sendRecordingLabel: {
    color: JP.white,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
