"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Edit3,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  User,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NewsActivityBlock, NewsMediaBlock } from "@/components/news/news-media";
import { TextBackgroundBanner } from "@/components/news/text-background-picker";
import { RichTextContent } from "@/components/news/rich-text-editor";
import { CATEGORY_STYLES, type NewsPostItem } from "@/lib/news/constants";
import { formatCompactCount, formatDateTime, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NewsAdminDetailModalProps {
  post: NewsPostItem | null;
  open: boolean;
  onClose: () => void;
  onArchive: (id: number) => void;
}

export function NewsAdminDetailModal({ post, open, onClose, onArchive }: NewsAdminDetailModalProps) {
  if (!post) return null;

  const hasTextBg = post.text_background && post.text_background !== "none" && post.media_type === "text";

  const stats = [
    { icon: Eye, label: "Vues", value: post.views_count, color: "text-blue-600 bg-blue-50" },
    { icon: Heart, label: "Réactions", value: post.likes_count, color: "text-red-600 bg-red-50" },
    { icon: MessageCircle, label: "Commentaires", value: post.comments_count, color: "text-emerald-600 bg-emerald-50" },
    { icon: Share2, label: "Partages", value: post.shares_count, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Détail de la publication"
      description={post.title}
      size="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Link href={`/actualites/${post.id}`} target="_blank">
            <Button variant="secondary">
              <ExternalLink className="mr-2 h-4 w-4" />
              Voir en public
            </Button>
          </Link>
          <Link href={`/actualites/gestion/${post.id}`}>
            <Button>
              <Edit3 className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          <Button variant="danger" onClick={() => onArchive(post.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Archiver
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", CATEGORY_STYLES[post.category])}>
            {post.category_badge || post.category_label}
          </span>
          <StatusPill status={post.status ?? "published"} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
              <div className={cn("mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg", color)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-slate-900">{formatCompactCount(value)}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <InfoRow icon={User} label="Auteur" value={post.author ?? "Jeunesse Parle"} />
          <InfoRow icon={Calendar} label="Publié" value={formatDateTime(post.created_at)} />
          <InfoRow icon={BarChart3} label="Rôle" value={post.author_role ?? "—"} />
          <InfoRow icon={Calendar} label="Il y a" value={formatRelative(post.created_at)} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Aperçu du contenu</h3>
          {hasTextBg ? (
            <TextBackgroundBanner backgroundId={post.text_background} title={post.title} body={post.body} />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="font-semibold text-slate-900">{post.title}</h4>
              <div className="mt-2">
                <RichTextContent content={post.body} />
              </div>
            </div>
          )}
          <NewsMediaBlock post={post} />
        </div>

        {post.activity ? <NewsActivityBlock activity={post.activity} /> : null}
      </div>
    </Modal>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-800",
    draft: "bg-amber-100 text-amber-800",
    archived: "bg-slate-200 text-slate-600",
  };
  const labels: Record<string, string> = {
    published: "Publié",
    draft: "Brouillon",
    archived: "Archivé",
  };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", styles[status] ?? styles.published)}>
      {labels[status] ?? status}
    </span>
  );
}
