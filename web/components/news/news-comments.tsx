"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import type { NewsCommentItem } from "@/lib/news/constants";
import { formatRelative } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

interface NewsCommentsProps {
  postId: number;
  comments: NewsCommentItem[];
  onChange: (comments: NewsCommentItem[]) => void;
  onCountChange?: (count: number) => void;
}

export function NewsComments({ postId, comments, onChange, onCountChange }: NewsCommentsProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await api.post<{ data: NewsCommentItem }>(`/news/${postId}/comments`, {
        body: body.trim(),
        ...(replyTo ? { parent_id: replyTo } : {}),
      });

      if (replyTo) {
        onChange(
          comments.map((c) =>
            c.id === replyTo ? { ...c, replies: [...(c.replies ?? []), res.data] } : c,
          ),
        );
      } else {
        onChange([res.data, ...comments]);
        onCountChange?.(comments.length + 1);
      }

      setBody("");
      setReplyTo(null);
      toast.success("Commentaire publié.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: number, parentId?: number | null) {
    setBusy(true);
    try {
      await api.delete(`/news/comments/${commentId}`);
      if (parentId) {
        onChange(
          comments.map((c) =>
            c.id === parentId ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) } : c,
          ),
        );
      } else {
        onChange(comments.filter((c) => c.id !== commentId));
        onCountChange?.(Math.max(0, comments.length - 1));
      }
      toast.success("Commentaire supprimé.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-slate-100 pt-4">
      <h3 className="text-sm font-semibold text-slate-800">Commentaires</h3>

      <form onSubmit={submit} className="space-y-2">
        {replyTo ? (
          <p className="text-xs text-brand-600">
            Réponse en cours…{" "}
            <button type="button" className="underline" onClick={() => setReplyTo(null)}>
              Annuler
            </button>
          </p>
        ) : null}
        <div className="flex gap-2">
          <Input
            placeholder="Votre commentaire…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={busy}>
            Publier
          </Button>
        </div>
      </form>

      <ul className="space-y-3">
        {comments.map((comment) => (
          <CommentNode
            key={comment.id}
            comment={comment}
            userName={user?.name}
            onReply={() => setReplyTo(comment.id)}
            onDelete={() => void remove(comment.id)}
            onDeleteReply={(replyId) => void remove(replyId, comment.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function CommentNode({
  comment,
  userName,
  onReply,
  onDelete,
  onDeleteReply,
}: {
  comment: NewsCommentItem;
  userName?: string;
  onReply: () => void;
  onDelete: () => void;
  onDeleteReply: (id: number) => void;
}) {
  const canDelete = comment.author === userName;

  return (
    <li className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">{comment.author}</p>
          <p className="mt-0.5 text-sm text-slate-600">{comment.body}</p>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
            <span>{formatRelative(comment.created_at)}</span>
            <button type="button" className="font-medium text-brand-600 hover:underline" onClick={onReply}>
              Répondre
            </button>
          </div>
        </div>
        {canDelete ? (
          <button type="button" onClick={onDelete} className="text-slate-400 hover:text-red-500" aria-label="Supprimer">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {(comment.replies ?? []).length > 0 ? (
        <ul className="ml-4 mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
          {comment.replies!.map((reply) => (
            <li key={reply.id} className="text-sm">
              <p className="text-xs font-semibold text-slate-700">{reply.author}</p>
              <p className="text-slate-600">{reply.body}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span>{formatRelative(reply.created_at)}</span>
                {reply.author === userName ? (
                  <button type="button" className="text-red-500 hover:underline" onClick={() => onDeleteReply(reply.id)}>
                    Supprimer
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
