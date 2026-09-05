"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Reply,
  Send,
} from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import {
  commentHomePost,
  getPublicHomePostComments,
  type HomePostComment,
} from "@/lib/home-posts";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import { formatCompactCount, formatDateTime, formatNumber } from "@/lib/utils";

const PER_PAGE = 8;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function HomePostCommentsPanel({
  postId,
  initialCount = 0,
  onCountChange,
}: {
  postId: number;
  initialCount?: number;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<HomePostComment[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRoots, setTotalRoots] = useState(0);
  const [commentsCount, setCommentsCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<HomePostComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number, silent = false) => {
      if (!silent) setLoading(true);
      const result = await getPublicHomePostComments(postId, targetPage, PER_PAGE, { silent });
      setComments(result.data);
      setPage(result.meta.current_page);
      setLastPage(result.meta.last_page);
      setTotalRoots(result.meta.total);
      setCommentsCount(result.comments_count);
      onCountChange?.(result.comments_count);
      if (!silent) setLoading(false);
    },
    [postId, onCountChange],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useEffect(() => {
    const tick = () => void load(page, true);
    const timer = window.setInterval(tick, getFastPollMs());
    const unsubscribe = subscribeRealtimeRefresh(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [load, page]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOkMessage(null);
    const parentId = replyTo?.id;
    const wasReply = Boolean(parentId);
    try {
      const result = await commentHomePost(postId, {
        author_name: name.trim(),
        author_email: email.trim() || undefined,
        body: body.trim(),
        parent_id: parentId,
      });
      setCommentsCount(result.comments_count);
      onCountChange?.(result.comments_count);
      setBody("");
      setReplyTo(null);
      setOkMessage(wasReply ? "Votre réponse a été publiée." : "Votre commentaire a été publié.");
      await load(wasReply ? page : 1, true);
      if (!wasReply) setPage(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="commentaires"
      className="mt-8 scroll-mt-24 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] sm:p-8"
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-brand-600 uppercase">Discussion</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Commentaires ({formatCompactCount(commentsCount)})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Répondez en direct — les nouveaux messages apparaissent automatiquement.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5"
      >
        {replyTo && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2 text-xs text-brand-800">
            <span>
              Réponse à <strong>{replyTo.author_name}</strong>
            </span>
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => setReplyTo(null)}
            >
              Annuler
            </button>
          </div>
        )}
        {error && (
          <Alert tone="error" title="Commentaire">
            {error}
          </Alert>
        )}
        {okMessage && (
          <Alert tone="success" title="Merci">
            {okMessage}
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
          label={replyTo ? "Votre réponse" : "Votre commentaire"}
          required
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            replyTo
              ? `Répondre à ${replyTo.author_name}…`
              : "Partagez votre avis sur cette actualité…"
          }
        />
        <div className="flex justify-end">
          <Button type="submit" loading={busy}>
            <Send className="h-4 w-4" />
            {replyTo ? "Publier la réponse" : "Publier le commentaire"}
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement des commentaires…</p>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-700">Aucun commentaire pour l’instant</p>
            <p className="mt-1 text-xs text-slate-500">Soyez le premier à réagir.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex gap-3">
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
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(comment);
                      setOkMessage(null);
                      document.getElementById("commentaires")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Répondre
                  </button>
                </div>
              </div>

              {(comment.replies?.length ?? 0) > 0 && (
                <ul className="mt-3 space-y-2 border-l-2 border-brand-100 ml-5 pl-4 sm:ml-12">
                  {comment.replies!.map((reply) => (
                    <li key={reply.id} className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900">{reply.author_name}</p>
                        {reply.created_at && (
                          <time className="text-[10px] text-slate-400">
                            {formatDateTime(reply.created_at)}
                          </time>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{reply.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </div>

      {lastPage > 1 && (
        <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Page {page} / {lastPage} · {formatNumber(totalRoots)} fils de discussion
          </p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => void load(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => void load(page + 1)}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </section>
  );
}
