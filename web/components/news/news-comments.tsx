"use client";

import { useState } from "react";
import { ChevronDown, Heart, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import type { NewsCommentItem } from "@/lib/news/constants";
import { cn, formatRelative } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

interface ReplyTarget {
  rootId: number;
  authorName: string;
}

interface NewsCommentsProps {
  postId: number;
  comments: NewsCommentItem[];
  totalCount?: number;
  defaultOpen?: boolean;
  onChange: (comments: NewsCommentItem[]) => void;
  onCountChange?: (count: number) => void;
}

export function NewsComments({
  postId,
  comments,
  totalCount,
  defaultOpen = false,
  onChange,
  onCountChange,
}: NewsCommentsProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const displayCount = totalCount ?? comments.length;

  function updateCommentInTree(list: NewsCommentItem[], updated: NewsCommentItem): NewsCommentItem[] {
    return list.map((c) => {
      if (c.id === updated.id) return { ...c, ...updated };
      if (c.replies?.length) {
        return { ...c, replies: updateCommentInTree(c.replies, updated) };
      }
      return c;
    });
  }

  function removeFromTree(list: NewsCommentItem[], commentId: number): NewsCommentItem[] {
    return list
      .filter((c) => c.id !== commentId)
      .map((c) => (c.replies?.length ? { ...c, replies: removeFromTree(c.replies, commentId) } : c));
  }

  function patchComment(updated: NewsCommentItem, parentId?: number | null) {
    if (parentId) {
      onChange(
        comments.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).map((r) => (r.id === updated.id ? updated : r)) }
            : c,
        ),
      );
    } else {
      onChange(updateCommentInTree(comments, updated));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await api.post<{ data: NewsCommentItem }>(`/news/${postId}/comments`, {
        body: body.trim(),
        ...(replyTo ? { parent_id: replyTo.rootId } : {}),
      });

      if (replyTo) {
        onChange(
          comments.map((c) =>
            c.id === replyTo.rootId ? { ...c, replies: [...(c.replies ?? []), res.data] } : c,
          ),
        );
      } else {
        onChange([res.data, ...comments]);
        onCountChange?.(displayCount + 1);
      }

      setBody("");
      setReplyTo(null);
      if (!open) setOpen(true);
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
        onCountChange?.(Math.max(0, displayCount - 1));
      }
      toast.success("Commentaire supprimé.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left transition hover:bg-slate-50"
      >
        <h3 className="text-sm font-semibold text-slate-800">
          Commentaires{displayCount > 0 ? ` (${displayCount})` : ""}
        </h3>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-4">
          <form onSubmit={submit} className="space-y-2">
            {replyTo ? (
              <p className="flex items-center gap-2 text-xs text-brand-600">
                Réponse à <span className="font-semibold">{replyTo.authorName}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 underline"
                  onClick={() => setReplyTo(null)}
                >
                  <X className="h-3 w-3" />
                  Annuler
                </button>
              </p>
            ) : null}
            <div className="flex gap-2">
              <Input
                placeholder={replyTo ? "Votre réponse…" : "Votre commentaire…"}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={busy}>
                Publier
              </Button>
            </div>
          </form>

          {comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <CommentNode
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  busy={busy}
                  onReply={(target) => {
                    setReplyTo(target);
                    setOpen(true);
                  }}
                  onDelete={() => void remove(comment.id)}
                  onDeleteReply={(replyId) => void remove(replyId, comment.id)}
                  onPatch={(updated, parentId) => patchComment(updated, parentId)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucun commentaire pour le moment. Soyez le premier !</p>
          )}
        </div>
      ) : displayCount > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 text-xs font-medium text-brand-600 hover:underline"
        >
          Afficher {displayCount} commentaire{displayCount > 1 ? "s" : ""}
        </button>
      ) : null}
    </div>
  );
}

function CommentNode({
  comment,
  currentUserId,
  busy,
  rootId,
  onReply,
  onDelete,
  onDeleteReply,
  onPatch,
}: {
  comment: NewsCommentItem;
  currentUserId?: number;
  busy: boolean;
  rootId?: number;
  onReply: (target: ReplyTarget) => void;
  onDelete: () => void;
  onDeleteReply: (id: number) => void;
  onPatch: (updated: NewsCommentItem, parentId?: number | null) => void;
}) {
  const toast = useToast();
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [likeBusy, setLikeBusy] = useState(false);

  const isOwner = currentUserId != null && comment.user_id === currentUserId;
  const threadRootId = rootId ?? comment.id;
  const replies = comment.replies ?? [];
  const hasReplies = replies.length > 0;
  const edited = comment.updated_at && comment.updated_at !== comment.created_at;

  async function saveEdit() {
    if (!editBody.trim()) return;
    setLikeBusy(true);
    try {
      const res = await api.patch<{ data: NewsCommentItem }>(`/news/comments/${comment.id}`, {
        body: editBody.trim(),
      });
      onPatch(res.data, rootId ?? null);
      setEditing(false);
      toast.success("Commentaire modifié.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Modification impossible.");
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleLike() {
    setLikeBusy(true);
    try {
      const res = await api.post<{ likes_count: number; liked: boolean }>(
        `/news/comments/${comment.id}/like`,
        comment.liked ? { remove: true } : {},
      );
      onPatch(
        { ...comment, likes_count: res.likes_count, liked: res.liked },
        rootId ?? null,
      );
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <li className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800">{comment.author}</p>

          {editing ? (
            <div className="mt-1.5 space-y-2">
              <Input value={editBody} onChange={(e) => setEditBody(e.target.value)} className="text-sm" />
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={likeBusy || busy} onClick={() => void saveEdit()}>
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={likeBusy || busy}
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{comment.body}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>
              {formatRelative(comment.created_at)}
              {edited ? " · modifié" : ""}
            </span>
            <button
              type="button"
              disabled={likeBusy || busy}
              onClick={() => void toggleLike()}
              className={cn(
                "inline-flex items-center gap-1 font-medium transition",
                comment.liked ? "text-rose-500" : "text-slate-500 hover:text-rose-500",
              )}
            >
              <Heart className={cn("h-3.5 w-3.5", comment.liked && "fill-current")} />
              {comment.likes_count > 0 ? comment.likes_count : "J'aime"}
            </button>
            <button
              type="button"
              className="font-medium text-brand-600 hover:underline"
              onClick={() =>
                onReply({
                  rootId: threadRootId,
                  authorName: comment.author,
                })
              }
            >
              Répondre
            </button>
            {isOwner && !editing ? (
              <button
                type="button"
                className="inline-flex items-center gap-0.5 font-medium text-slate-500 hover:text-brand-600"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </button>
            ) : null}
          </div>
        </div>

        {isOwner && !editing ? (
          <button
            type="button"
            onClick={rootId ? () => onDeleteReply(comment.id) : onDelete}
            className="shrink-0 text-slate-400 hover:text-red-500"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {hasReplies ? (
        <div className="ml-3 mt-3 border-l-2 border-slate-200 pl-3">
          <button
            type="button"
            onClick={() => setRepliesOpen((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", repliesOpen && "rotate-180")} />
            {repliesOpen
              ? "Masquer les réponses"
              : `Voir ${replies.length} réponse${replies.length > 1 ? "s" : ""}`}
          </button>

          {repliesOpen ? (
            <ul className="mt-2 space-y-2">
              {replies.map((reply) => (
                <CommentNode
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  busy={busy}
                  rootId={threadRootId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onDeleteReply={onDeleteReply}
                  onPatch={onPatch}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
