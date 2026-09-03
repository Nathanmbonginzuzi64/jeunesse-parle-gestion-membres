import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MembrePageHeader } from '@/components/membre/page-header';
import { NewsPostCard } from '@/components/membre/news-post-card';
import { NewsComments } from '@/components/membre/news-comments';
import { api, ApiError, resolveMediaUrl } from '@/lib/api';
import type { NewsPostItem } from '@/lib/news';
import { useBackgroundRefresh } from '@/lib/use-background-refresh';
import { JP } from '@/constants/theme';

function mapPost(item: NewsPostItem): NewsPostItem {
  return {
    ...item,
    media_url: resolveMediaUrl(item.media_url),
    gallery_urls: (item.gallery_urls ?? [])
      .map((url) => resolveMediaUrl(url))
      .filter(Boolean) as string[],
    likes_count: Number(item.likes_count ?? 0),
    comments_count: Number(item.comments_count ?? 0),
    shares_count: Number(item.shares_count ?? 0),
    views_count: Number(item.views_count ?? 0),
    comments: item.comments ?? [],
  };
}

export default function ActualiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<NewsPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ rootId: number; authorName: string } | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    const silent = Boolean(opts?.silent);
    try {
      const response = await api.get<{ data?: NewsPostItem } | NewsPostItem>(`/news/${id}`);
      const raw =
        response && typeof response === 'object' && 'data' in response
          ? (response.data as NewsPostItem)
          : (response as NewsPostItem);
      if (!raw) {
        if (!silent) {
          setItem(null);
          setError('Actualité introuvable.');
        }
        return;
      }
      setItem(mapPost(raw));
      setError(null);
    } catch (err) {
      if (!silent) {
        setItem(null);
        setError(err instanceof ApiError ? err.message : 'Chargement impossible.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  useBackgroundRefresh(() => load({ silent: true }));

  function patchComments(comments: NewsPostItem['comments']) {
    setItem((current) => (current ? { ...current, comments } : current));
  }

  return (
    <View style={styles.screen}>
      <MembrePageHeader
        title="Actualité"
        subtitle={item?.title ?? (loading ? 'Chargement…' : 'Détail')}
        icon="newspaper-outline"
        showBack
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? Math.max(insets.top, 8) : 0}
      >
        {loading ? (
          <ActivityIndicator color={JP.brand} style={{ marginTop: 40 }} />
        ) : error || !item ? (
          <Text style={styles.error}>{error || 'Actualité introuvable.'}</Text>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <NewsPostCard
                post={item}
                hideComments
                onUpdated={setItem}
                onCommentPress={() => setFocusToken((n) => n + 1)}
              />
              <View style={styles.commentsWrap}>
                <NewsComments
                  postId={item.id}
                  comments={item.comments ?? []}
                  totalCount={item.comments_count}
                  listOnly
                  replyTo={replyTo}
                  onReplyToChange={setReplyTo}
                  onChange={(comments) => {
                    patchComments(comments);
                  }}
                  onCountChange={(count) =>
                    setItem((current) =>
                      current ? { ...current, comments_count: count } : current,
                    )
                  }
                />
              </View>
            </ScrollView>

            <NewsComments
              postId={item.id}
              comments={item.comments ?? []}
              totalCount={item.comments_count}
              composerOnly
              docked
              replyTo={replyTo}
              onReplyToChange={setReplyTo}
              focusToken={focusToken}
              onChange={(comments) => {
                patchComments(comments);
              }}
              onCountChange={(count) =>
                setItem((current) =>
                  current ? { ...current, comments_count: count } : current,
                )
              }
            />
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EEF3F8' },
  body: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  commentsWrap: {
    marginTop: 12,
    backgroundColor: JP.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: JP.border,
    padding: 14,
  },
  error: { marginTop: 24, textAlign: 'center', color: JP.danger, fontWeight: '700' },
});
