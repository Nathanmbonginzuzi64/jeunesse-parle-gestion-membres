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
import {
  categoryLabel,
  formatDateTime,
  statusLabel,
  type JpMessageItem,
  type JpMessageReply,
} from '@/lib/jp-message';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

type Bubble = {
  id: string;
  body: string;
  author: string;
  is_admin: boolean;
  created_at: string;
};

export default function DossierJpMessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [ticket, setTicket] = useState<JpMessageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!id) return;
      const silent = Boolean(opts?.silent);
      try {
        const response = await api.get<{ data: JpMessageItem }>(`/jp-messages/${id}`);
        setTicket(response.data);
        setError(null);
      } catch (err) {
        if (!silent) {
          setError(err instanceof ApiError ? err.message : 'Dossier introuvable.');
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

  useBackgroundRefresh(() => load({ silent: true }));

  async function sendReply() {
    const text = reply.trim();
    if (!text || !id) return;
    setSending(true);
    try {
      const response = await api.post<{ data: JpMessageReply }>(`/jp-messages/${id}/replies`, {
        body: text,
      });
      setReply('');
      setTicket((current) =>
        current
          ? {
              ...current,
              replies: [
                ...(current.replies ?? []),
                response.data ?? {
                  id: Date.now(),
                  body: text,
                  author: 'Vous',
                  is_admin: false,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  const bubbles: Bubble[] = ticket
    ? [
        {
          id: `root-${ticket.id}`,
          body: ticket.body,
          author: ticket.author_label ?? 'Vous',
          is_admin: false,
          created_at: ticket.created_at,
        },
        ...(ticket.replies ?? []).map((item) => ({
          id: `r-${item.id}`,
          body: item.body,
          author: item.author,
          is_admin: item.is_admin,
          created_at: item.created_at,
        })),
      ]
    : [];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: JP.bg }}>
        <MembrePageHeader
          title="Dossier"
          subtitle="Chargement…"
          icon="folder-open-outline"
          showBack
          showNotifications={false}
        />
        <View style={styles.center}>
          <ActivityIndicator color={JP.brand} />
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={{ flex: 1, backgroundColor: JP.bg }}>
        <MembrePageHeader
          title="Dossier"
          subtitle="Introuvable"
          icon="folder-open-outline"
          showBack
          showNotifications={false}
        />
        <Text style={styles.error}>{error ?? 'Dossier introuvable.'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title={ticket.subject}
        subtitle={`${ticket.reference} · ${categoryLabel(ticket.category)} · ${statusLabel(ticket.status)}`}
        icon="folder-open-outline"
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
          data={bubbles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.is_admin ? styles.admin : styles.member]}>
              <Text style={[styles.author, item.is_admin && styles.authorAdmin]}>
                {item.author} · {formatDateTime(item.created_at)}
              </Text>
              <Text style={[styles.body, item.is_admin && { color: JP.white }]}>{item.body}</Text>
            </View>
          )}
        />
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.input}
            placeholder="Répondre au dossier…"
            placeholderTextColor={JP.muted}
            value={reply}
            onChangeText={setReply}
            multiline
          />
          <Pressable
            onPress={() => void sendReply()}
            disabled={sending || !reply.trim()}
            style={[styles.send, (!reply.trim() || sending) && { opacity: 0.5 }]}
          >
            <Text style={styles.sendText}>Envoyer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: JP.bg },
  error: { color: JP.danger, padding: 12, textAlign: 'center', fontWeight: '600' },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  member: {
    alignSelf: 'flex-start',
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
  },
  admin: { alignSelf: 'flex-end', backgroundColor: JP.brandDark },
  author: { fontSize: 11, fontWeight: '700', color: JP.muted, marginBottom: 4 },
  authorAdmin: { color: 'rgba(255,255,255,0.75)' },
  body: { fontSize: 14, color: JP.text, lineHeight: 20 },
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
