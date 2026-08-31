"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MessageCircle, Share2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NewsActivityBlock, NewsMediaBlock } from "@/components/news/news-media";
import { NewsComments } from "@/components/news/news-comments";
import { NewsReactions } from "@/components/news/news-reactions";
import { RichTextContent } from "@/components/news/rich-text-editor";
import { TextBackgroundBanner } from "@/components/news/text-background-picker";
import { api, ApiError } from "@/lib/api";
import { CATEGORY_STYLES, type NewsPostItem } from "@/lib/news/constants";
import { formatNumber, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export type { NewsPostItem } from "@/lib/news/constants";

interface NewsPostCardProps {
  post: NewsPostItem;
  onUpdated?: () => void;
  compact?: boolean;
}

export function NewsPostCard({ post: initial, onUpdated, compact = false }: NewsPostCardProps) {
  const toast = useToast();
  const [post, setPost] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function patch(update: Partial<NewsPostItem>) {
    setPost((p) => ({ ...p, ...update }));
  }

  async function loadDetail() {
    if (expanded && post.comments) return;
    setBusy(true);
    try {
      const res = await api.get<{ data: NewsPostItem }>(`/news/${post.id}`);
      setPost(res.data);
      setExpanded(true);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Chargement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function share(channel: string) {
    setBusy(true);
    setShareOpen(false);
    try {
      const res = await api.post<{ shares_count: number; share_url: string }>(`/news/${post.id}/share`, { channel });
      patch({ shares_count: res.shares_count });

      if (channel === "copy_link") {
        await navigator.clipboard.writeText(res.share_url || `${window.location.origin}/actualites/${post.id}`);
        toast.success("Lien copié.");
      } else {
        toast.success("Partage enregistré.");
      }
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Partage impossible.");
    } finally {
      setBusy(false);
    }
  }

  const badge = post.category_badge;
  const bodyPreview = post.body.length > 280 && compact ? `${post.body.slice(0, 280)}…` : post.body;
  const hasTextBg = post.media_type === "text" && post.text_background && post.text_background !== "none";

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition hover:border-brand-200/60 hover:shadow-lg">
      <div className="p-5">
      <header className="flex gap-3">
        <Avatar name={post.author ?? "JP"} size="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{post.author ?? "Jeunesse Parle"}</p>
            {post.author_role ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                {post.author_role}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">{formatRelative(post.created_at)}</p>
        </div>
        {badge ? (
          <span
            className={cn(
              "shrink-0 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
              CATEGORY_STYLES[post.category],
            )}
          >
            {badge}
          </span>
        ) : null}
      </header>

      <div className="mt-4">
        {hasTextBg ? (
          <Link href={`/actualites/${post.id}`} className="block">
            <TextBackgroundBanner
              backgroundId={post.text_background}
              title={post.title}
              body={compact ? bodyPreview : post.body}
              compact={compact}
            />
          </Link>
        ) : (
          <>
            <Link href={`/actualites/${post.id}`} className="block">
              <h2 className="text-lg font-semibold text-slate-900 transition group-hover:text-brand-700">{post.title}</h2>
            </Link>
            <div className="mt-2">
              {compact ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{bodyPreview}</p>
              ) : (
                <RichTextContent content={post.body} />
              )}
            </div>
          </>
        )}
        {!compact ? <NewsMediaBlock post={post} /> : null}
        {post.activity ? <NewsActivityBlock activity={post.activity} /> : null}
      </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
        <NewsReactions post={post} onUpdate={patch} disabled={busy} />
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadDetail()}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-600 transition hover:bg-white hover:shadow-sm"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments_count}
        </button>
        <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() => setShareOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-600 transition hover:bg-white hover:shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            {post.shares_count}
          </button>
          {shareOpen ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
              <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
                <ShareMenuItem label="Dans l'application" onClick={() => void share("in_app")} />
                <ShareMenuItem label="Copier le lien" onClick={() => void share("copy_link")} />
                <ShareMenuItem
                  label="Facebook"
                  onClick={() => {
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/actualites/${post.id}`)}`,
                      "_blank",
                    );
                    void share("social");
                  }}
                />
                <ShareMenuItem
                  label="WhatsApp"
                  onClick={() => {
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`${post.title} ${window.location.origin}/actualites/${post.id}`)}`,
                      "_blank",
                    );
                    void share("social");
                  }}
                />
              </div>
            </>
          ) : null}
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
          <Eye className="h-3.5 w-3.5" />
          {formatNumber(post.views_count)} vues
        </span>
      </footer>

      {expanded ? (
        <div className="px-5 pb-5">
          <NewsComments
            postId={post.id}
            comments={post.comments ?? []}
            onChange={(comments) => patch({ comments })}
            onCountChange={(count) => {
              patch({ comments_count: count });
              onUpdated?.();
            }}
          />
        </div>
      ) : null}

      {compact && !hasTextBg ? (
        <div className="px-5 pb-4">
          <Link
            href={`/actualites/${post.id}`}
            className="inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Lire la suite →
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function ShareMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
