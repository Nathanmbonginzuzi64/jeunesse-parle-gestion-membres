"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { NEWS_REACTIONS, type NewsPostItem, type NewsReactionType } from "@/lib/news/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface NewsReactionsProps {
  post: NewsPostItem;
  onUpdate: (patch: Partial<NewsPostItem>) => void;
  disabled?: boolean;
}

export function NewsReactions({ post, onUpdate, disabled }: NewsReactionsProps) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function react(type: NewsReactionType) {
    setBusy(true);
    setOpen(false);
    try {
      const removing = post.my_reaction === type;
      const res = await api.post<{
        likes_count: number;
        my_reaction: NewsReactionType | null;
        reactions: Record<string, number>;
      }>(`/news/${post.id}/react`, removing ? { remove: true } : { type });

      onUpdate({
        likes_count: res.likes_count,
        my_reaction: res.my_reaction,
        reactions: res.reactions,
      });
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  const active = NEWS_REACTIONS.find((r) => r.type === post.my_reaction);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          if (post.my_reaction) void react(post.my_reaction);
          else setOpen((v) => !v);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition",
          post.my_reaction
            ? "bg-red-50 text-red-600 ring-1 ring-red-200"
            : "text-slate-600 hover:bg-slate-100",
        )}
      >
        <span>{active?.emoji ?? "❤️"}</span>
        <span>{post.likes_count > 0 ? `${post.likes_count} j'aime` : "J'aime"}</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 flex gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
            {NEWS_REACTIONS.map((r) => (
              <button
                key={r.type}
                type="button"
                title={r.label}
                disabled={busy}
                onClick={() => void react(r.type)}
                className="rounded-xl p-2 text-xl transition hover:scale-110 hover:bg-slate-100"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
