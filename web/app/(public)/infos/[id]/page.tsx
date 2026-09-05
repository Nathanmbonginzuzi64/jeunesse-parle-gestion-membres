"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Heart, MessageCircle, Newspaper, Send } from "lucide-react";
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
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function InfosDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<(HomePost & { comments?: HomePostComment[] }) | null>(null);
  const [comments, setComments] = useState<HomePostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const data = await getPublicHomePost(params.id);
      if (cancelled) return;
      if (!data) {
        setError("Cette actualité est introuvable ou n'est plus publiée.");
        setPost(null);
      } else {
        setPost(data);
        setComments(data.comments ?? []);
        setLiked(Boolean(data.liked_by_me));
        setLikesCount(data.likes_count ?? 0);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function toggleLike() {
    if (!post || likeBusy) return;
    setLikeBusy(true);
    try {
      const result = await likeHomePost(post.id, liked);
      setLiked(result.liked_by_me);
      setLikesCount(result.likes_count);
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
    } catch (caught) {
      setCommentError(caught instanceof Error ? caught.message : "Envoi impossible.");
    } finally {
      setCommentBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-slate-500">
        Chargement de l&apos;actualité…
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

  const paragraphs = (post.body ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="bg-[var(--background)] pb-20">
      <div className="relative isolate overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="h-full w-full object-cover opacity-50" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-800 to-brand-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/55 to-slate-950" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 pt-10 pb-16 sm:pt-14">
          <Link
            href="/infos"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Actualités
          </Link>

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-md">
            <div className="relative aspect-[16/9] bg-slate-800">
              {post.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Newspaper className="h-14 w-14 text-white/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
              {post.published_at && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <time className="rounded-full border border-white/30 bg-white/95 px-5 py-2 text-sm font-semibold text-slate-800 shadow-xl backdrop-blur">
                    {formatDate(post.published_at)}
                  </time>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {post.category && (
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold tracking-wide text-brand-800 uppercase">
                    {post.category}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                {post.title}
              </h1>

              {post.excerpt && (
                <p className="mt-3 text-base leading-relaxed text-slate-600">{post.excerpt}</p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4 border-y border-slate-100 py-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {post.views_count ?? 0} vues
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className={cn("h-4 w-4", liked && "fill-rose-500 text-rose-500")} />
                  {likesCount} j&apos;aime
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count ?? comments.length} commentaires
                </span>
              </div>

              {paragraphs.length > 0 && (
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                  {paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>{p}</p>
                  ))}
                </div>
              )}

              {post.external_url && (
                <a
                  href={post.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex text-sm font-semibold text-brand-700 hover:underline"
                >
                  {post.external_url.match(/\.(mp4|webm|mov)(\?|$)/i)
                    ? "Voir la vidéo associée →"
                    : "Ouvrir le lien →"}
                </a>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={liked ? "primary" : "outline"}
                  loading={likeBusy}
                  onClick={() => void toggleLike()}
                  className={cn(liked && "bg-rose-600 hover:bg-rose-700")}
                >
                  <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                  {liked ? "Aimé" : "J'aime"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-6 px-4">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)] sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Commentaires ({post.comments_count ?? comments.length})
          </h2>

          <form onSubmit={submitComment} className="mt-5 space-y-4">
            {commentError && (
              <Alert tone="error" title="Commentaire">
                {commentError}
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
              placeholder="Partagez votre avis…"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={commentBusy}>
                <Send className="h-4 w-4" />
                Publier
              </Button>
            </div>
          </form>

          <ul className="mt-8 space-y-4">
            {comments.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Soyez le premier à commenter.
              </li>
            ) : (
              comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{comment.author_name}</p>
                    {comment.created_at && (
                      <time className="text-[11px] text-slate-400">
                        {formatDateTime(comment.created_at)}
                      </time>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {comment.body}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
