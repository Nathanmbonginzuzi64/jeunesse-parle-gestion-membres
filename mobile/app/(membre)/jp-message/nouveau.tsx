import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BigButton, Field, Screen } from '@/components/ui';
import { MembrePageHeader } from '@/components/membre/page-header';
import { EmptyState } from '@/components/membre/section';
import { api, ApiError } from '@/lib/api';
import {
  JP_CATEGORIES,
  type ChatContact,
  type ChatConversationItem,
  type JpCategory,
  type JpMessageItem,
} from '@/lib/jp-message';
import { JP } from '@/constants/theme';

type Mode = 'directory' | 'ticket';

export default function NouveauJpMessageScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('directory');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<JpCategory>('demande');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const response = await api.get<{ data: ChatContact[] }>('/jp-messages/directory', {
        q: debouncedQ || undefined,
        page: 1,
        per_page: 40,
      });
      setContacts(response.data ?? []);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const grouped = useMemo(() => {
    const map = new Map<string, { id: string; label: string; contacts: ChatContact[] }>();
    for (const contact of contacts) {
      const id = contact.group_id ?? 'all';
      const label = contact.group_label ?? 'Contacts';
      if (!map.has(id)) map.set(id, { id, label, contacts: [] });
      map.get(id)!.contacts.push(contact);
    }
    return Array.from(map.values());
  }, [contacts]);

  async function openChat(userId: number) {
    setOpeningId(userId);
    try {
      const response = await api.post<{ data: ChatConversationItem }>('/jp-messages/chats', {
        user_id: userId,
      });
      router.replace(`/(membre)/chat/${response.data.id}`);
    } catch (err) {
      Alert.alert(
        'Conversation',
        err instanceof ApiError ? err.message : 'Impossible de démarrer la conversation.',
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function submitTicket() {
    const nextErrors: Record<string, string> = {};
    if (!subject.trim()) nextErrors.subject = 'Sujet requis.';
    if (!body.trim()) nextErrors.body = 'Description requise.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    try {
      const response = await api.post<{ data: JpMessageItem }>('/jp-messages', {
        subject: subject.trim(),
        category,
        body: body.trim(),
      });
      router.replace(`/(membre)/jp-message/dossier/${response.data.id}`);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(err.errors)) {
          mapped[key] = messages[0] ?? err.message;
        }
        setErrors(mapped);
      } else {
        Alert.alert(
          'Dossier',
          err instanceof ApiError ? err.message : 'Envoi impossible.',
        );
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: JP.bg }}>
      <MembrePageHeader
        title="Nouveau"
        subtitle={mode === 'directory' ? 'Contacter' : 'Dossier officiel'}
        icon="add-circle-outline"
        showBack
        showNotifications={false}
      />
      <Screen style={{ backgroundColor: JP.bg, paddingTop: 8 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setMode('directory')}
            style={[styles.tab, mode === 'directory' && styles.tabOn]}
          >
            <Text style={[styles.tabText, mode === 'directory' && styles.tabTextOn]}>
              Contacter
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('ticket')}
            style={[styles.tab, mode === 'ticket' && styles.tabOn]}
          >
            <Text style={[styles.tabText, mode === 'ticket' && styles.tabTextOn]}>
              Dossier officiel
            </Text>
          </Pressable>
        </View>

        {mode === 'directory' ? (
          <>
            <Field
              label="Rechercher"
              placeholder="Nom, JP-RDC… ou un responsable"
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              {debouncedQ
                ? 'Résultats de recherche (membres inclus si autorisés)'
                : 'Responsables de votre périmètre — recherchez pour un membre'}
            </Text>

            {loadingContacts ? (
              <ActivityIndicator color={JP.brand} style={{ marginTop: 20 }} />
            ) : grouped.length === 0 ? (
              <EmptyState
                title="Aucun interlocuteur"
                subtitle="Aucun contact autorisé pour votre périmètre."
              />
            ) : (
              grouped.map((group) => (
                <View key={group.id} style={styles.group}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  {group.contacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      style={styles.contact}
                      disabled={openingId === contact.id}
                      onPress={() => void openChat(contact.id)}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {contact.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        <Text style={styles.contactMeta} numberOfLines={1}>
                          {[contact.role, contact.scope, contact.member_code]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      {openingId === contact.id ? (
                        <ActivityIndicator color={JP.brand} />
                      ) : (
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={JP.brand} />
                      )}
                    </Pressable>
                  ))}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              Ouvrez une requête officielle (demande, plainte, suggestion…). L’équipe JP Message
              vous répondra dans le dossier.
            </Text>
            <Field
              label="Sujet"
              placeholder="Ex. Demande de mise à jour de ma fiche"
              value={subject}
              onChangeText={setSubject}
              error={errors.subject}
              maxLength={200}
            />

            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.cats}>
              {JP_CATEGORIES.map((item) => {
                const on = category === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setCategory(item.value)}
                    style={[styles.cat, on && styles.catOn]}
                  >
                    <Text style={[styles.catText, on && styles.catTextOn]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textarea, errors.body ? styles.textareaError : null]}
              placeholder="Décrivez votre requête…"
              placeholderTextColor={JP.muted}
              value={body}
              onChangeText={setBody}
              multiline
              textAlignVertical="top"
              maxLength={5000}
            />
            {errors.body ? <Text style={styles.error}>{errors.body}</Text> : null}

            <View style={{ height: 16 }} />
            <BigButton
              label="Soumettre le dossier"
              onPress={() => void submitTicket()}
              loading={sending}
            />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E8EEF4',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabOn: { backgroundColor: JP.white },
  tabText: { fontSize: 13, fontWeight: '700', color: JP.muted },
  tabTextOn: { color: JP.brandDark },
  hint: { fontSize: 12, color: JP.muted, lineHeight: 17, marginBottom: 14 },
  group: { marginBottom: 16 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: JP.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: JP.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: JP.brand },
  contactName: { fontSize: 14, fontWeight: '800', color: JP.text },
  contactMeta: { marginTop: 2, fontSize: 11, color: JP.muted },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: JP.text,
    marginBottom: 8,
  },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  cat: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: JP.white,
    borderWidth: 1,
    borderColor: JP.border,
  },
  catOn: { backgroundColor: JP.brandLight, borderColor: JP.brand },
  catText: { fontSize: 12, fontWeight: '700', color: JP.muted },
  catTextOn: { color: JP.brandDark },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 14,
    backgroundColor: JP.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: JP.text,
  },
  textareaError: { borderColor: JP.danger },
  error: { marginTop: 6, fontSize: 12, color: JP.danger, fontWeight: '600' },
});
