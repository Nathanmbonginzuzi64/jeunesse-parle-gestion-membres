"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Heart, MessageCircle, Newspaper, Share2 } from "lucide-react";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import {
  getPublicHomePostsPage,
  type HomePost,
  type HomePostsPage,
} from "@/lib/home-posts";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import { formatCompactCount, formatNumber } from "@/lib/utils";

function dateBadgeParts(value: string): { day: string; month: string; year: string } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate());
  const month = date
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(/\./g, "")
    .trim()
    .toUpperCase();
  const year = String(date.getFullYear());
  return { day, month, year };
}

function postsSignature(posts: HomePost[]): string {
  return posts
    .map(
      (p) =>
        `${p.id}:${p.updated_at ?? p.published_at ?? ""}:${p.views_count ?? 0}:${p.likes_count ?? 0}:${p.comments_count ?? 0}:${p.shares_count ?? 0}:${p.title}`,
    )
    .join("|");
}

export function InfosFeed({
  initial,
  page,
  perPage,
}: {
  initial: HomePostsPage;
  page: number;
  perPage: number;
}) {
  const [posts, setPosts] = useState(initial.data);
  const [meta, setMeta] = useState(initial.meta);
  const signatureRef = useRef(postsSignature(initial.data));
  const busyRef = useRef(false);

  const refreshQuietly = useCallback(async () => {
    if (busyRef.current || document.visibilityState === "hidden") return;
    busyRef.current = true;
    try {
      const next = await getPublicHomePostsPage(page, perPage);
      const nextSig = postsSignature(next.data);
      const metaChanged =
        next.meta.total !== meta.total ||
        next.meta.last_page !== meta.last_page ||
        next.meta.current_page !== meta.current_page;

      if (nextSig !== signatureRef.current || metaChanged) {
        signatureRef.current = nextSig;
        setPosts(next.data);
        setMeta(next.meta);
      }
    } catch {
      /* ignore network blips */
    } finally {
      busyRef.current = false;
    }
  }, [page, perPage, meta.total, meta.last_page, meta.current_page]);

  useEffect(() => {
    setPosts(initial.data);
    setMeta(initial.meta);
    signatureRef.current = postsSignature(initial.data);
  }, [initial, page]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshQuietly(), getFastPollMs());
    const unsubscribe = subscribeRealtimeRefresh(() => void refreshQuietly());
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [refreshQuietly]);

  const currentPage = meta.current_page;
  const lastPage = meta.last_page;
  const total = meta.total;
  const from = total === 0 ? 0 : (currentPage - 1) * meta.per_page + 1;
  const to = Math.min(currentPage * meta.per_page, total);

  if (posts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm">
        <Newspaper className="mx-auto h-9 w-9 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">Aucune publication pour le moment</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post, index) => (
          <RevealOnScroll key={post.id} delay={Math.min(index * 45, 220)} className="h-full">
            <HomePostCard post={post} />
          </RevealOnScroll>
        ))}
      </div>

      {lastPage > 1 && (
        <nav
          className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          aria-label="Pagination des actualités"
        >
          <p className="text-xs text-slate-500">
            {formatNumber(from)}–{formatNumber(to)} sur <strong>{formatNumber(total)}</strong>{" "}
            publications
          </p>
          <div className="flex items-center gap-1.5">
            {currentPage > 1 ? (
              <Link
                href={currentPage - 1 <= 1 ? "/infos" : `/infos?page=${currentPage - 1}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </Link>
            ) : (
              <span className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs text-slate-300">
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Précédent</span>
              </span>
            )}
            <span className="px-2 text-xs text-slate-600">
              Page {currentPage} / {lastPage}
            </span>
            {currentPage < lastPage ? (
              <Link
                href={`/infos?page=${currentPage + 1}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs text-slate-300">
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

function HomePostCard({ post }: { post: HomePost }) {
  const preview = post.excerpt || (post.body ?? "").replace(/\n+/g, " ").trim();
  const badge = post.published_at ? dateBadgeParts(post.published_at) : null;

  return (
    <Link
      href={`/infos/${post.id}`}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)] transition duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_22px_50px_-28px_rgba(0,102,153,0.35)]">
        <div className="relative aspect-[16/11] overflow-hidden bg-slate-200">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
              <Newspaper className="h-12 w-12 text-white/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />

          {post.category && (
            <span className="absolute top-3 right-3 rounded-full bg-brand-600/95 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
              {post.category}
            </span>
          )}
        </div>

        <div className="relative flex flex-1 flex-col border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-white p-5 pt-10 sm:p-6 sm:pt-11">
          {badge && (
            <time
              dateTime={post.published_at ?? undefined}
              className="absolute -top-8 left-4 flex h-[4.35rem] w-[3.75rem] flex-col items-center justify-center rounded-xl bg-[#002d72] px-1 py-1.5 text-white shadow-[0_8px_20px_-6px_rgba(0,45,114,0.65)]"
              aria-label={`Publié le ${badge.day} ${badge.month} ${badge.year}`}
            >
              <span className="text-lg leading-none font-bold tabular-nums">{badge.day}</span>
              <span className="mt-0.5 text-[9px] leading-none font-bold tracking-wide uppercase">
                {badge.month}
              </span>
              <span className="mt-0.5 text-[9px] leading-none font-semibold tabular-nums opacity-90">
                {badge.year}
              </span>
            </time>
          )}

          <h2 className="text-lg font-semibold leading-snug text-slate-900 transition group-hover:text-brand-800">
            {post.title}
          </h2>

          {preview && (
            <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{preview}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold">
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-sky-700"
              title={`${post.views_count ?? 0} vues`}
            >
              <Eye className="h-3.5 w-3.5" />
              {formatCompactCount(post.views_count)}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-rose-700"
              title={`${post.likes_count ?? 0} likes`}
            >
              <Heart className="h-3.5 w-3.5" />
              {formatCompactCount(post.likes_count)}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700"
              title={`${post.comments_count ?? 0} commentaires`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {formatCompactCount(post.comments_count)}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-violet-700"
              title={`${post.shares_count ?? 0} partages`}
            >
              <Share2 className="h-3.5 w-3.5" />
              {formatCompactCount(post.shares_count)}
            </span>
            <span className="ml-auto text-brand-700 group-hover:underline">Lire →</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
