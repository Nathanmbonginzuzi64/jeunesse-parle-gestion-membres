import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { NewsMediaBlock } from '@/components/membre/news-media';
import { TextBackgroundBanner } from '@/components/membre/text-background-banner';
import { NewsReactions } from '@/components/membre/news-reactions';
import { NewsComments } from '@/components/membre/news-comments';
import { api, ApiError } from '@/lib/api';
import { downloadNewsMedia } from '@/lib/news-download';
import {
  formatCount,
  formatRelative,
  NEWS_REACTIONS,
  type NewsPostItem,
} from '@/lib/news';
import { hasTextBackground } from '@/lib/text-backgrounds';
import { JP } from '@/constants/theme';

type Props = {
  post: NewsPostItem;
  compact?: boolean;
  /** Masque le bloc commentaires (géré hors carte, ex. barre collée en bas). */
  hideComments?: boolean;
  onUpdated?: (post: NewsPostItem) => void;
  onCommentPress?: () => void;
};

export function NewsPostCard({
  post: initial,
  compact = false,
  hideComments = false,
  onUpdated,
  onCommentPress,
}: Props) {
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPost(initial);
  }, [initial]);

  function patch(update: Partial<NewsPostItem>) {
    setPost((current) => {
      const next = { ...current, ...update };
      onUpdated?.(next);
      return next;
    });
  }

  const body = post.body?.trim() ?? '';
  const preview =
    compact && body.length > 220 ? `${body.slice(0, 220).trim()}…` : body;
  const withTextBg = hasTextBackground(post.media_type, post.text_background);
  const hasDownloadable =
    Boolean(post.media_url) &&
    ['image', 'photo', 'img', 'video', 'pdf', 'document', 'file', 'gallery'].includes(
      String(post.media_type ?? '').toLowerCase(),
    );

  async function sharePost() {
    setBusy(true);
    try {
      const res = await api.post<{ shares_count: number; share_url: string }>(
        `/news/${post.id}/share`,
        { channel: 'social' },
      );
      patch({ shares_count: res.shares_count });
      const url = res.share_url || '';
      await Share.share({
        message: [post.title, body ? body.slice(0, 120) : null, url].filter(Boolean).join('\n\n'),
        title: post.title,
      });
    } catch (caught) {
      Alert.alert(
        'Partage',
        caught instanceof ApiError ? caught.message : 'Partage impossible.',
      );
    } finally {
      setBusy(false);
    }
  }

  function openDetail() {
    router.push(`/(membre)/actualite/${post.id}`);
  }

  const reactionSummary = NEWS_REACTIONS.map((r) => ({
    ...r,
    count: Number(post.reactions?.[r.type] ?? 0),
  })).filter((r) => r.count > 0);
  const likesTotal = Number(post.likes_count ?? 0);

  return (
    <View style={styles.card}>
      <Pressable onPress={compact ? openDetail : undefined} disabled={!compact}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(post.author || 'JP').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.author} numberOfLines={1}>
              {post.author || 'Jeunesse Parle'}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[post.author_role, formatRelative(post.created_at)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {post.category_label || post.category_badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {post.category_badge || post.category_label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title}>{post.title}</Text>
        {withTextBg ? (
          <View style={styles.textBgWrap}>
            <TextBackgroundBanner
              backgroundId={post.text_background}
              title={post.title}
              body={compact ? preview : body}
              compact={compact}
            />
          </View>
        ) : preview ? (
          <Text style={styles.body} numberOfLines={compact ? 5 : undefined}>
            {preview}
          </Text>
        ) : null}
      </Pressable>

      {post.media_type && post.media_type !== 'text' ? (
        <View style={styles.media}>
          <NewsMediaBlock item={post} compact={compact} />
        </View>
      ) : null}

      <View style={styles.stats}>
        {likesTotal > 0 ? (
          <View style={styles.reactionStats}>
            {(reactionSummary.length > 0
              ? reactionSummary.slice(0, 3)
              : [
                  {
                    emoji:
                      NEWS_REACTIONS.find((r) => r.type === post.my_reaction)?.emoji ?? '❤️',
                    count: likesTotal,
                  },
                ]
            ).map((r) => (
              <Text key={r.emoji + String(r.count)} style={styles.reactionStat}>
                {r.emoji} {formatCount(r.count)}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.statText}>🤍 0</Text>
        )}
        <Pressable onPress={compact ? openDetail : undefined} disabled={!compact}>
          <Text style={styles.statText}>
            {formatCount(post.comments_count)} commentaires
          </Text>
        </Pressable>
        <Text style={styles.statText}>{formatCount(post.shares_count)} partages</Text>
        <Text style={[styles.statText, { marginLeft: 'auto' }]}>
          {formatCount(post.views_count)} vues
        </Text>
      </View>

      <View style={styles.actions}>
        <NewsReactions post={post} onUpdate={patch} disabled={busy} />
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            if (compact) openDetail();
            else onCommentPress?.();
          }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={JP.muted} />
          <Text style={styles.actionLabel}>Commenter</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => void sharePost()} disabled={busy}>
          <Ionicons name="share-social-outline" size={18} color={JP.muted} />
          <Text style={styles.actionLabel}>Partager</Text>
        </Pressable>
      </View>

      <View style={styles.secondary}>
        {compact ? (
          <Pressable style={styles.secondaryBtn} onPress={openDetail}>
            <Ionicons name="expand-outline" size={16} color={JP.brand} />
            <Text style={styles.secondaryText}>Voir en détail</Text>
          </Pressable>
        ) : null}
        {hasDownloadable ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              void downloadNewsMedia({
                mediaUrl: post.media_url,
                mediaType: post.media_type,
                title: post.title,
              })
            }
          >
            <Ionicons name="download-outline" size={16} color={JP.brand} />
            <Text style={styles.secondaryText}>Télécharger</Text>
          </Pressable>
        ) : null}
      </View>

      {!compact && !hideComments ? (
        <NewsComments
          postId={post.id}
          comments={post.comments ?? []}
          totalCount={post.comments_count}
          onChange={(comments) => patch({ comments })}
          onCountChange={(count) => patch({ comments_count: count })}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
    gap: 10,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: JP.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: JP.brand, fontSize: 15 },
  author: { fontSize: 14, fontWeight: '800', color: JP.text },
  meta: { marginTop: 2, fontSize: 11, fontWeight: '600', color: JP.muted },
  badge: {
    maxWidth: 110,
    backgroundColor: JP.brandLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: JP.brandDark },
  title: { fontSize: 16, fontWeight: '800', color: JP.text, lineHeight: 22 },
  body: { fontSize: 14, color: JP.text, lineHeight: 21 },
  textBgWrap: { marginTop: 10 },
  media: {
    marginHorizontal: -14,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: JP.border,
    paddingTop: 8,
  },
  statText: { fontSize: 12, fontWeight: '600', color: JP.muted },
  reactionStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionStat: { fontSize: 12, fontWeight: '700', color: JP.text },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: JP.border,
    marginHorizontal: -4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: JP.muted },
  secondary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: JP.brandLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryText: { fontSize: 12, fontWeight: '800', color: JP.brand },
});
