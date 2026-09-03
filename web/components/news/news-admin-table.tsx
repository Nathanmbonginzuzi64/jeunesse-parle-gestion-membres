"use client";

import Link from "next/link";
import { Edit3, ExternalLink, Eye, Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_STYLES, type NewsPostItem } from "@/lib/news/constants";
import { formatNumber, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NewsAdminTableProps {
  posts: NewsPostItem[];
  onViewDetail: (post: NewsPostItem) => void;
  onArchive: (id: number) => void;
}

export function NewsAdminTable({ posts, onViewDetail, onArchive }: NewsAdminTableProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)] lg:block">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-brand-50/30 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-4">Publication</th>
              <th className="px-4 py-4">Catégorie</th>
              <th className="px-4 py-4">Engagement</th>
              <th className="px-4 py-4">Statut</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {posts.map((post) => (
              <tr key={post.id} className="transition hover:bg-brand-50/20">
                <td className="px-5 py-4">
                  <PublicationCell post={post} />
                </td>
                <td className="px-4 py-4">
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold", CATEGORY_STYLES[post.category])}>
                    {post.category_badge || post.category_label}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <EngagementBadges post={post} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={post.status ?? "published"} />
                </td>
                <td className="px-5 py-4">
                  <ActionButtons post={post} onViewDetail={onViewDetail} onArchive={onArchive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)]">
            <PublicationCell post={post} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", CATEGORY_STYLES[post.category])}>
                {post.category_badge}
              </span>
              <StatusBadge status={post.status ?? "published"} />
            </div>
            <div className="mt-3">
              <EngagementBadges post={post} />
            </div>
            <div className="mt-4">
              <ActionButtons post={post} onViewDetail={onViewDetail} onArchive={onArchive} stacked />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function PublicationCell({ post }: { post: NewsPostItem }) {
  const preview = post.text_background && post.text_background !== "none" ? post.body.split("\n")[0] : post.title;
  const mediaLabel =
    post.media_type === "video"
      ? "Vidéo"
      : post.media_type === "image"
        ? "Photo"
        : post.media_type === "document"
          ? "PDF"
          : post.media_type === "link"
            ? "Lien"
            : null;

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-blue-700 text-lg font-bold text-white shadow-sm">
        {post.author?.charAt(0) ?? "J"}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-1 font-semibold text-slate-900">{post.title}</p>
        <p className="line-clamp-1 text-xs text-slate-500">{preview}</p>
        <p className="mt-1 text-xs text-slate-400">
          {post.author ?? "Jeunesse Parle"} · {formatRelative(post.created_at)}
          {mediaLabel ? ` · ${mediaLabel}` : null}
        </p>
      </div>
    </div>
  );
}

function EngagementBadges({ post }: { post: NewsPostItem }) {
  const items = [
    { id: "views", icon: Eye, value: post.views_count, color: "text-blue-600" },
    { id: "likes", icon: Heart, value: post.likes_count, color: "text-red-500" },
    { id: "comments", icon: MessageCircle, value: post.comments_count, color: "text-emerald-600" },
    { id: "shares", icon: Share2, value: post.shares_count, color: "text-violet-600" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ id, icon: Icon, value, color }) => (
        <span
          key={id}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-100"
        >
          <Icon className={cn("h-3 w-3", color)} />
          {formatNumber(value)}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    draft: "bg-amber-50 text-amber-700 ring-amber-200",
    archived: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  const labels: Record<string, string> = {
    published: "Publié",
    draft: "Brouillon",
    archived: "Archivé",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", styles[status] ?? styles.published)}>
      {labels[status] ?? status}
    </span>
  );
}

function ActionButtons({
  post,
  onViewDetail,
  onArchive,
  stacked = false,
}: {
  post: NewsPostItem;
  onViewDetail: (post: NewsPostItem) => void;
  onArchive: (id: number) => void;
  stacked?: boolean;
}) {
  return (
    <div className={cn("flex gap-1.5", stacked ? "w-full flex-wrap" : "justify-end")}>
      <Button type="button" size="sm" variant="secondary" onClick={() => onViewDetail(post)} className={stacked ? "flex-1" : ""}>
        <Eye className="mr-1.5 h-3.5 w-3.5" />
        Détail
      </Button>
      <Link href={`/actualites/${post.id}`} target="_blank">
        <Button type="button" size="sm" variant="ghost" title="Voir en public">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </Link>
      <Link href={`/actualites/gestion/${post.id}`}>
        <Button type="button" size="sm" variant="ghost" title="Modifier">
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </Link>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        title="Archiver"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => onArchive(post.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
