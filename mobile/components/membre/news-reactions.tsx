import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '@/lib/api';
import {
  NEWS_REACTIONS,
  type NewsPostItem,
  type NewsReactionType,
} from '@/lib/news';
import { JP } from '@/constants/theme';

type Props = {
  post: NewsPostItem;
  onUpdate: (patch: Partial<NewsPostItem>) => void;
  disabled?: boolean;
};

export function NewsReactions({ post, onUpdate, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function react(type: NewsReactionType) {
    setBusy(true);
    setOpen(false);
    try {
      const removing = post.my_reaction === type;
      const res = await api.post<{
        likes_count: number;
        my_reaction: NewsReactionType | null;
        reactions: Record<string, number>;
      }>(`/news/${post.id}/react`, removing ? { remove: true } : { type });
      onUpdate({
        likes_count: res.likes_count,
        my_reaction: res.my_reaction,
        reactions: res.reactions,
      });
    } catch (caught) {
      // silencieux — l’UI garde l’état précédent
      if (!(caught instanceof ApiError)) return;
    } finally {
      setBusy(false);
    }
  }

  const active = NEWS_REACTIONS.find((r) => r.type === post.my_reaction);
  const liked = Boolean(post.my_reaction);
  const count = Number(post.likes_count ?? 0);

  return (
    <>
      <Pressable
        disabled={disabled || busy}
        onPress={() => {
          if (post.my_reaction) void react(post.my_reaction);
          else void react('like');
        }}
        onLongPress={() => setOpen(true)}
        style={[styles.btn, liked && styles.btnOn]}
        accessibilityLabel={liked ? `${active?.label ?? "J'aime"}, ${count}` : "J'aime"}
      >
        <Text style={styles.emoji}>{active?.emoji ?? '🤍'}</Text>
        {count > 0 ? (
          <Text style={[styles.count, liked && styles.countOn]}>{count}</Text>
        ) : null}
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.picker}>
            {NEWS_REACTIONS.map((r) => (
              <Pressable
                key={r.type}
                onPress={() => void react(r.type)}
                style={[
                  styles.pickItem,
                  post.my_reaction === r.type && styles.pickItemOn,
                ]}
                accessibilityLabel={r.label}
              >
                <Text style={styles.pickEmoji}>{r.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnOn: { backgroundColor: '#FEF2F2' },
  emoji: { fontSize: 18 },
  count: { fontSize: 13, fontWeight: '800', color: JP.muted, minWidth: 12 },
  countOn: { color: '#DC2626' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,31,51,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: JP.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#0B1F33',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  pickItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickItemOn: { backgroundColor: '#FEF2F2' },
  pickEmoji: { fontSize: 26 },
});
