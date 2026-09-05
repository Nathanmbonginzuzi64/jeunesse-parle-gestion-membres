"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Newspaper,
  Play,
  Send,
  Share2,
} from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import {
  commentHomePost,
  getPublicHomePost,
  likeHomePost,
  type HomePost,
  type HomePostComment,
} from "@/lib/home-posts";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import { cn, formatDateTime } from "@/lib/utils";

function dateBadgeParts(value: string): { day: string; month: string } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()),
    month: date
      .toLocaleDateString("fr-FR", { month: "short" })
      .replace(/\./g, "")
      .trim()
      .toUpperCase(),
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url?.match(/\.(mp4|webm|mov)(\?|$)/i));
}

export default function InfosDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<(HomePost & { comments?: HomePostComment[] }) | null>(null);
  const [comments, setComments] = useState<HomePostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likePulse, setLikePulse] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentOk, setCommentOk] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const data = await getPublicHomePost(params.id, { silent });
      if (!data) {
        if (!silent) {
          setError("Cette actualité est introuvable ou n'est plus publiée.");
          setPost(null);
        }
      } else {
        setPost(data);
        setComments(data.comments ?? []);
        setLiked(Boolean(data.liked_by_me));
        setLikesCount(data.likes_count ?? 0);
        setViewsCount(data.views_count ?? 0);
      }
      if (!silent) setLoading(false);
    },
    [params.id],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const tick = () => void load(true);
    const timer = window.setInterval(tick, getFastPollMs());
    const unsubscribe = subscribeRealtimeRefresh(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [load]);

  const badge = useMemo(
    () => (post?.published_at ? dateBadgeParts(post.published_at) : null),
    [post?.published_at],
  );

  const paragraphs = useMemo(
    () =>
      (post?.body ?? "")
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [post?.body],
  );

  async function toggleLike() {
    if (!post || likeBusy) return;
    setLikeBusy(true);
    try {
      const result = await likeHomePost(post.id, liked);
      setLiked(result.liked_by_me);
      setLikesCount(result.likes_count);
      if (result.liked_by_me) {
        setLikePulse(true);
        window.setTimeout(() => setLikePulse(false), 450);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Like impossible.");
    } finally {
      setLikeBusy(false);
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!post || commentBusy) return;
    setCommentBusy(true);
    setCommentError(null);
    setCommentOk(false);
    try {
      const result = await commentHomePost(post.id, {
        author_name: name.trim(),
        author_email: email.trim() || undefined,
        body: body.trim(),
      });
      setComments((current) => [result.comment, ...current]);
      setPost((current) =>
        current ? { ...current, comments_count: result.comments_count } : current,
      );
      setBody("");
      setCommentOk(true);
    } catch (caught) {
      setCommentError(caught instanceof Error ? caught.message : "Envoi impossible.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function sharePost() {
    if (!post || typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.excerpt ?? post.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareHint("Lien copié");
      window.setTimeout(() => setShareHint(null), 2000);
    } catch {
      /* ignore cancel */
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--background)] pb-20">
        <div className="h-64 animate-pulse bg-slate-200 sm:h-80" />
        <div className="mx-auto max-w-3xl space-y-4 px-4 -mt-16">
          <div className="h-56 animate-pulse rounded-3xl bg-white shadow-sm" />
          <div className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16">
        <Alert tone="error" title="Introuvable">
          {error}
        </Alert>
        <Link href="/infos" className="inline-flex text-sm font-medium text-brand-700 hover:underline">
          ← Retour aux actualités
        </Link>
      </div>
    );
  }

  if (!post) return null;

  const commentsCount = post.comments_count ?? comments.length;
  const video = isVideoUrl(post.external_url);

  return (
    <div className="bg-[var(--background)] pb-24">
      {/* Hero */}
      <header className="relative isolate min-h-[18rem] overflow-hidden bg-slate-950 sm:min-h-[22rem]">
        <div className="absolute inset-0">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="h-full w-full scale-105 object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-800 via-brand-900 to-slate-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/45 to-[var(--background)]" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col px-4 pt-8 pb-24 sm:pt-10">
          <Link
            href="/infos"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux actualités
          </Link>

          <div className="mt-auto pt-16 sm:pt-24">
            <div className="flex flex-wrap items-center gap-2">
              {post.category && (
                <span className="rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase shadow">
                  {post.category}
                </span>
              )}
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                Publication officielle
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-4xl px-4">
        {/* Media card overlapping hero */}
        <div className="-mt-16 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] sm:-mt-20">
          <div className="relative aspect-[16/9] bg-slate-100">
            {post.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-700 to-brand-950">
                <Newspaper className="h-16 w-16 text-white/35" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 to-transparent" />
            {badge && (
              <time
                dateTime={post.published_at ?? undefined}
                className="absolute bottom-4 left-4 flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-2xl bg-[#002d72] text-white shadow-[0_10px_28px_-8px_rgba(0,45,114,0.7)]"
              >
                <span className="text-2xl leading-none font-bold tabular-nums">{badge.day}</span>
                <span className="mt-1 text-[10px] font-bold tracking-wide uppercase">{badge.month}</span>
              </time>
            )}
          </div>

          {/* Stats + actions */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-8">
            <StatChip icon={<Eye className="h-3.5 w-3.5" />} label={`${viewsCount} vues`} />
            <StatChip
              icon={
                <Heart className={cn("h-3.5 w-3.5", liked && "fill-rose-500 text-rose-500")} />
              }
              label={`${likesCount} j'aime`}
            />
            <StatChip
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              label={`${commentsCount} commentaires`}
            />

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={liked ? "primary" : "outline"}
                size="sm"
                loading={likeBusy}
                onClick={() => void toggleLike()}
                className={cn(
                  "transition",
                  liked && "bg-rose-600 hover:bg-rose-700",
                  likePulse && "scale-105",
                )}
              >
                <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                {liked ? "Aimé" : "J'aime"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void sharePost()}>
                <Share2 className="h-4 w-4" />
                {shareHint ?? "Partager"}
              </Button>
              <a
                href="#commentaires"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Commenter
              </a>
            </div>
          </div>

          <article className="px-5 py-7 sm:px-8 sm:py-9">
            {paragraphs.length > 0 ? (
              <div className="space-y-5 text-[15px] leading-8 text-slate-700 sm:text-base">
                {paragraphs.map((p) => (
                  <p key={p.slice(0, 56)}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun contenu détaillé pour cette publication.</p>
            )}

            {post.external_url && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {video ? (
                  <div>
                    <video
                      controls
                      preload="metadata"
                      poster={post.image_url ?? undefined}
                      className="aspect-video w-full bg-black object-contain"
                    >
                      <source src={post.external_url} />
                    </video>
                    <div className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-slate-600">
                      <Play className="h-3.5 w-3.5 text-brand-600" />
                      Vidéo associée à cette actualité
                    </div>
                  </div>
                ) : (
                  <a
                    href={post.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 px-4 py-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ouvrir le lien associé
                    </span>
                    <span className="truncate text-xs font-normal text-slate-400">{post.external_url}</span>
                  </a>
                )}
              </div>
            )}
          </article>
        </div>

        {/* Comments */}
        <section
          id="commentaires"
          className="mt-8 scroll-mt-24 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] sm:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-brand-600 uppercase">
                Discussion
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Commentaires ({commentsCount})
              </h2>
            </div>
          </div>

          <form
            onSubmit={submitComment}
            className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5"
          >
            {commentError && (
              <Alert tone="error" title="Commentaire">
                {commentError}
              </Alert>
            )}
            {commentOk && (
              <Alert tone="success" title="Merci">
                Votre commentaire a été publié.
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nom"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Votre nom"
              />
              <Input
                label="E-mail (optionnel)"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@exemple.com"
              />
            </div>
            <Textarea
              label="Votre commentaire"
              required
              rows={4}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Partagez votre avis sur cette actualité…"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={commentBusy}>
                <Send className="h-4 w-4" />
                Publier le commentaire
              </Button>
            </div>
          </form>

          <ul className="mt-8 space-y-3">
            {comments.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
                <MessageCircle className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">Aucun commentaire pour l’instant</p>
                <p className="mt-1 text-xs text-slate-500">Soyez le premier à réagir à cette publication.</p>
              </li>
            ) : (
              comments.map((comment) => (
                <li
                  key={comment.id}
                  className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm transition hover:border-brand-100"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {initials(comment.author_name) || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{comment.author_name}</p>
                      {comment.created_at && (
                        <time className="text-[11px] text-slate-400">
                          {formatDateTime(comment.created_at)}
                        </time>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{comment.body}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            href="/infos"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Voir toutes les actualités
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
      {icon}
      {label}
    </span>
  );
}
