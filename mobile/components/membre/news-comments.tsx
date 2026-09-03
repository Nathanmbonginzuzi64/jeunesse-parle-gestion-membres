import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAboveKeyboard } from '@/components/keyboard-safe';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRelative, type NewsCommentItem } from '@/lib/news';
import { JP } from '@/constants/theme';

const COMMENT_EMOJIS = [
  '😀', '😂', '🥰', '😍', '🤩', '😎', '🙏', '👏',
  '👍', '❤️', '🔥', '🎉', '💯', '✨', '🙌', '💪',
  '😢', '😮', '🤔', '👀', '✅', '⭐', '🌟', '💙',
];

type ReplyTarget = { rootId: number; authorName: string };

type Props = {
  postId: number;
  comments: NewsCommentItem[];
  totalCount?: number;
  onChange: (comments: NewsCommentItem[]) => void;
  onCountChange?: (count: number) => void;
  /** Barre de saisie collée en bas (monte avec le clavier). */
  docked?: boolean;
  /** N’affiche que la liste (sans saisie). */
  listOnly?: boolean;
  /** N’affiche que la barre de saisie. */
  composerOnly?: boolean;
  replyTo?: ReplyTarget | null;
  onReplyToChange?: (value: ReplyTarget | null) => void;
  /** Incrémente pour forcer le focus sur la zone de saisie. */
  focusToken?: number;
};

export function NewsComments({
  postId,
  comments,
  totalCount,
  onChange,
  onCountChange,
  docked = false,
  listOnly = false,
  composerOnly = false,
  replyTo: replyToProp,
  onReplyToChange,
  focusToken = 0,
}: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState('');
  const [replyToInternal, setReplyToInternal] = useState<ReplyTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const composerRef = useRef<View>(null);
  const keepAbove = useKeepAboveKeyboard(composerRef);

  const replyTo = onReplyToChange ? (replyToProp ?? null) : replyToInternal;
  const setReplyTo = onReplyToChange ?? setReplyToInternal;

  const displayCount = totalCount ?? comments.length;

  function insertEmoji(emoji: string) {
    setBody((current) => `${current}${emoji}`);
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    if (focusToken > 0) {
      inputRef.current?.focus();
    }
  }, [focusToken]);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: NewsCommentItem }>(`/news/${postId}/comments`, {
        body: text,
        ...(replyTo ? { parent_id: replyTo.rootId } : {}),
      });
      if (replyTo) {
        onChange(
          comments.map((c) =>
            c.id === replyTo.rootId
              ? { ...c, replies: [...(c.replies ?? []), res.data] }
              : c,
          ),
        );
      } else {
        onChange([res.data, ...comments]);
        onCountChange?.(displayCount + 1);
      }
      setBody('');
      setReplyTo(null);
      setEmojiOpen(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Publication impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(comment: NewsCommentItem, parentId?: number | null) {
    try {
      const res = await api.post<{ likes_count: number; liked: boolean }>(
        `/news/comments/${comment.id}/like`,
      );
      const updated = { ...comment, likes_count: res.likes_count, liked: res.liked };
      if (parentId) {
        onChange(
          comments.map((c) =>
            c.id === parentId
              ? {
                  ...c,
                  replies: (c.replies ?? []).map((r) => (r.id === comment.id ? updated : r)),
                }
              : c,
          ),
        );
      } else {
        onChange(comments.map((c) => (c.id === comment.id ? updated : c)));
      }
    } catch {
      /* ignore */
    }
  }

  async function remove(commentId: number, parentId?: number | null) {
    try {
      await api.delete(`/news/comments/${commentId}`);
      if (parentId) {
        onChange(
          comments.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
              : c,
          ),
        );
      } else {
        onChange(comments.filter((c) => c.id !== commentId));
        onCountChange?.(Math.max(0, displayCount - 1));
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Suppression impossible.');
    }
  }

  const composer = (
    <View
      ref={composerRef}
      collapsable={false}
      style={[
        styles.composer,
        docked && styles.composerDocked,
        docked && { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      {replyTo ? (
        <View style={styles.replyBanner}>
          <Text style={styles.replyText} numberOfLines={1}>
            Réponse à {replyTo.authorName}
          </Text>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color={JP.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <Pressable
          onPress={() => {
            setEmojiOpen((open) => !open);
            if (!emojiOpen) inputRef.current?.focus();
          }}
          style={[styles.emojiBtn, emojiOpen && styles.emojiBtnOn]}
          accessibilityLabel="Insérer un emoji"
          hitSlop={6}
        >
          <Ionicons
            name={emojiOpen ? 'happy' : 'happy-outline'}
            size={22}
            color={emojiOpen ? JP.brand : JP.muted}
          />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={replyTo ? 'Écrire une réponse…' : 'Écrire un commentaire…'}
          placeholderTextColor={JP.muted}
          value={body}
          onChangeText={setBody}
          multiline
          onFocus={() => {
            if (!docked) keepAbove.onFocus();
          }}
          onBlur={() => {
            if (!docked) keepAbove.onBlur();
          }}
        />
        <Pressable
          onPress={() => void submit()}
          disabled={busy || !body.trim()}
          style={[styles.send, (!body.trim() || busy) && { opacity: 0.45 }]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={JP.white} />
          ) : (
            <Ionicons name="send" size={16} color={JP.white} />
          )}
        </Pressable>
      </View>
      {emojiOpen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.emojiRow}
        >
          {COMMENT_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => insertEmoji(emoji)}
              style={styles.emojiItem}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  const list = (
    <View style={styles.listBlock}>
      {!composerOnly ? (
        <Text style={styles.heading}>
          Commentaires{displayCount > 0 ? ` · ${displayCount}` : ''}
        </Text>
      ) : null}

      {comments.length === 0 ? (
        <Text style={styles.empty}>Soyez le premier à commenter.</Text>
      ) : (
        <View style={styles.list}>
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={comment.user_id === user?.id}
              onReply={() => setReplyTo({ rootId: comment.id, authorName: comment.author })}
              onLike={() => void toggleLike(comment)}
              onDelete={() => void remove(comment.id)}
            />
          ))}
        </View>
      )}
    </View>
  );

  if (composerOnly) return composer;
  if (listOnly) return <View style={styles.wrap}>{list}</View>;

  return (
    <View style={styles.wrap}>
      {list}
      {!listOnly ? composer : null}
    </View>
  );
}

function CommentRow({
  comment,
  canDelete,
  onReply,
  onLike,
  onDelete,
}: {
  comment: NewsCommentItem;
  canDelete?: boolean;
  onReply: () => void;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.comment}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(comment.author || '?').slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.bubble}>
          <Text style={styles.author}>{comment.author}</Text>
          <Text style={styles.body}>{comment.body}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatRelative(comment.created_at)}</Text>
          <Pressable onPress={onLike} hitSlop={6}>
            <Text style={[styles.metaAction, comment.liked && styles.metaLiked]}>
              J’aime{comment.likes_count > 0 ? ` · ${comment.likes_count}` : ''}
            </Text>
          </Pressable>
          <Pressable onPress={onReply} hitSlop={6}>
            <Text style={styles.metaAction}>Répondre</Text>
          </Pressable>
          {canDelete ? (
            <Pressable onPress={onDelete} hitSlop={6}>
              <Text style={[styles.metaAction, { color: JP.danger }]}>Supprimer</Text>
            </Pressable>
          ) : null}
        </View>

        {(comment.replies ?? []).map((reply) => (
          <View key={reply.id} style={styles.reply}>
            <View style={styles.avatarSm}>
              <Text style={styles.avatarTextSm}>
                {(reply.author || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.bubble}>
                <Text style={styles.author}>{reply.author}</Text>
                <Text style={styles.body}>{reply.body}</Text>
              </View>
              <Text style={[styles.time, { marginTop: 4 }]}>
                {formatRelative(reply.created_at)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 12 },
  listBlock: { gap: 12 },
  heading: { fontSize: 15, fontWeight: '800', color: JP.text },
  composer: { gap: 8 },
  composerDocked: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
    backgroundColor: JP.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: JP.brandLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyText: { flex: 1, fontSize: 12, fontWeight: '700', color: JP.brandDark },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  emojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  emojiBtnOn: { backgroundColor: JP.brandLight },
  emojiRow: {
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  emojiItem: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  emojiText: { fontSize: 22 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: JP.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: JP.text,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: JP.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 12, color: JP.danger, fontWeight: '600' },
  empty: { fontSize: 13, color: JP.muted, fontStyle: 'italic' },
  list: { gap: 14 },
  comment: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: JP.brand, fontSize: 14 },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextSm: { fontWeight: '800', color: JP.brand, fontSize: 11 },
  bubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  author: { fontSize: 12, fontWeight: '800', color: JP.text, marginBottom: 2 },
  body: { fontSize: 14, color: JP.text, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6, paddingLeft: 4 },
  time: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  metaAction: { fontSize: 11, fontWeight: '800', color: JP.muted },
  metaLiked: { color: '#DC2626' },
  reply: { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 4 },
});
