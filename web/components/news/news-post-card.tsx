"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface NewsPostItem {
  id: number;
  title: string;
  body: string;
  author?: string;
  activity?: { id: number; title: string; code: string } | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  comments?: Array<{ id: number; body: string; author: string; created_at: string }>;
}

export function NewsPostCard({
  post: initial,
  onUpdated,
}: {
  post: NewsPostItem;
  onUpdated?: () => void;
}) {
  const toast = useToast();
  const [post, setPost] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function react(type = "like") {
    setBusy(true);
    try {
      await api.post(`/news/${post.id}/react`, { type });
      setPost((p) => ({ ...p, likes_count: p.likes_count + 1 }));
      toast.success("Réaction enregistrée.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const res = await api.post<{ shares_count: number }>(`/news/${post.id}/share`);
      setPost((p) => ({ ...p, shares_count: res.shares_count }));
      toast.success("Partage enregistré.");
    } catch {
      setPost((p) => ({ ...p, shares_count: p.shares_count + 1 }));
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
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

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await api.post(`/news/${post.id}/comments`, { body: comment.trim() });
      setComment("");
      const res = await api.get<{ data: NewsPostItem }>(`/news/${post.id}`);
      setPost(res.data);
      setExpanded(true);
      onUpdated?.();
      toast.success("Commentaire publié.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-card border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <header className="mb-3">
        <p className="text-xs text-slate-500">
          {post.author ?? "Jeunesse Parle"} · {formatRelative(post.created_at)}
        </p>
        <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
        {post.activity ? (
          <p className="mt-1 text-xs text-brand-600">Activité : {post.activity.title}</p>
        ) : null}
      </header>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{post.body}</p>

      <footer className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => react("like")}>
          <Heart className={cn("mr-1 h-4 w-4", post.likes_count > 0 && "fill-red-500 text-red-500")} />
          {post.likes_count}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={loadComments}>
          <MessageCircle className="mr-1 h-4 w-4" />
          {post.comments_count}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={share}>
          <Share2 className="mr-1 h-4 w-4" />
          {post.shares_count}
        </Button>
        <span className="ml-auto text-xs text-slate-400">{post.views_count} vues</span>
      </footer>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {(post.comments ?? []).map((c) => (
            <div key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs font-medium text-slate-700">{c.author}</p>
              <p className="text-slate-600">{c.body}</p>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2">
            <Input
              placeholder="Votre commentaire…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={busy}>
              Publier
            </Button>
          </form>
        </div>
      ) : null}
    </article>
  );
}
