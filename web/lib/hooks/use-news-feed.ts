"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import type { NewsPostItem } from "@/lib/news/constants";

const POLL_MS = getFastPollMs();

interface NewsFeedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface UseNewsFeedOptions {
  q?: string;
  category?: string;
  enabled?: boolean;
}

export function useNewsFeed(options: UseNewsFeedOptions = {}) {
  const { q = "", category = "", enabled = true } = options;
  const [posts, setPosts] = useState<NewsPostItem[]>([]);
  const [meta, setMeta] = useState<NewsFeedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sinceRef = useRef<string | null>(null);
  const pageRef = useRef(1);

  const fetchPage = useCallback(
    async (page: number, append = false) => {
      if (!enabled) return;

      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const response = await api.get<{ data: NewsPostItem[]; meta: NewsFeedMeta }>("/news", {
          page,
          per_page: 15,
          ...(q ? { q } : {}),
          ...(category && category !== "all" ? { category } : {}),
        });

        setMeta(response.meta);
        pageRef.current = page;

        setPosts((current) => {
          if (!append) return response.data;
          const ids = new Set(current.map((p) => p.id));
          const merged = [...current];
          for (const post of response.data) {
            if (!ids.has(post.id)) merged.push(post);
          }
          return merged;
        });

        if (response.data[0]?.created_at) {
          sinceRef.current = response.data[0].created_at;
        }

        setError(null);
      } catch {
        setError("Impossible de charger les actualités.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [enabled, q, category],
  );

  const reload = useCallback(() => {
    pageRef.current = 1;
    void fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!meta || pageRef.current >= meta.last_page || loadingMore) return;
    void fetchPage(pageRef.current + 1, true);
  }, [meta, loadingMore, fetchPage]);

  const pollNew = useCallback(async () => {
    if (!enabled) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    try {
      // Si on a un curseur "since", n'injecte que les nouveaux posts.
      if (sinceRef.current) {
        const response = await api.get<{ data: NewsPostItem[] }>("/news", {
          since: sinceRef.current,
          per_page: 10,
          ...(category && category !== "all" ? { category } : {}),
        });

        if (response.data.length) {
          setPosts((current) => {
            const ids = new Set(current.map((p) => p.id));
            const fresh = response.data.filter((p) => !ids.has(p.id));
            if (!fresh.length) return current;
            sinceRef.current = fresh[0].created_at;
            return [...fresh, ...current];
          });
          window.dispatchEvent(
            new CustomEvent("jp:news-feed", { detail: { count: response.data.length } }),
          );
        }
        return;
      }

      // Sinon, rafraîchit la 1ʳᵉ page sans spinner.
      const response = await api.get<{ data: NewsPostItem[]; meta: NewsFeedMeta }>("/news", {
        page: 1,
        per_page: 15,
        ...(q ? { q } : {}),
        ...(category && category !== "all" ? { category } : {}),
      });
      setMeta(response.meta);
      setPosts((current) => {
        try {
          if (JSON.stringify(current) === JSON.stringify(response.data)) return current;
        } catch {
          /* ignore */
        }
        return response.data;
      });
      if (response.data[0]?.created_at) {
        sinceRef.current = response.data[0].created_at;
      }
    } catch {
      /* silencieux */
    }
  }, [enabled, category, q]);

  useEffect(() => {
    pageRef.current = 1;
    void fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => void pollNew(), POLL_MS);
    const unsubscribe = subscribeRealtimeRefresh(() => void pollNew());
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [enabled, pollNew]);

  return {
    posts,
    meta,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
    hasMore: meta ? pageRef.current < meta.last_page : false,
  };
}
