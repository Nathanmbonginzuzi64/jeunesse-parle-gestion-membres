import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type ChatMessage = {
  id: number;
  body?: string | null;
  author?: string | null;
  author_id?: number | null;
  created_at?: string | null;
};

export default function MembreChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{
        data: ChatMessage[];
        meta?: { can_send?: boolean };
      }>(`/jp-messages/chats/${id}/messages`);
      setMessages(response.data ?? []);
      setCanSend(response.meta?.can_send !== false);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useBackgroundRefresh(() => load({ silent: true }));

  async function send() {
    const text = body.trim();
    if (!text || !id) return;
    setSending(true);
    try {
      await api.post(`/jp-messages/chats/${id}/messages`, { body: text });
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: JP.bg }}>
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
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Conversation"
        subtitle={`#${id}`}
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
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
        renderItem={({ item }) => {
          const mine = item.author_id === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {!mine && item.author ? (
                <Text style={styles.author}>{item.author}</Text>
              ) : null}
              <Text style={[styles.body, mine && { color: JP.white }]}>{item.body}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Démarrez la conversation.</Text>
        }
      />
      {canSend ? (
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder="Écrire un message…"
            placeholderTextColor={JP.muted}
            value={body}
            onChangeText={setBody}
            multiline
          />
          <Pressable
            onPress={() => void send()}
            disabled={sending || !body.trim()}
            style={[styles.send, (!body.trim() || sending) && { opacity: 0.5 }]}
          >
            <Text style={styles.sendText}>Envoyer</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: JP.bg },
  error: { color: JP.danger, padding: 12, textAlign: 'center', fontWeight: '600' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  mine: { alignSelf: 'flex-end', backgroundColor: JP.brand },
  theirs: { alignSelf: 'flex-start', backgroundColor: JP.white, borderWidth: 1, borderColor: JP.border },
  author: { fontSize: 11, fontWeight: '700', color: JP.muted, marginBottom: 4 },
  body: { fontSize: 14, color: JP.text, lineHeight: 20 },
  empty: { textAlign: 'center', color: JP.muted, marginTop: 40 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: JP.border,
    backgroundColor: JP.white,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: JP.text,
  },
  send: {
    backgroundColor: JP.brand,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendText: { color: JP.white, fontWeight: '800', fontSize: 13 },
});
