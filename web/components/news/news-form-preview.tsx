"use client";

import { FileText, Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TextBackgroundBanner } from "@/components/news/text-background-picker";
import { RichTextContent } from "@/components/news/rich-text-editor";
import { CATEGORY_STYLES, NEWS_CATEGORIES } from "@/lib/news/constants";
import type { TextBackgroundId } from "@/lib/news/text-backgrounds";
import { toYoutubeEmbedUrl, YOUTUBE_IFRAME_ALLOW } from "@/lib/news/youtube";
import { cn } from "@/lib/utils";

interface NewsFormPreviewProps {
  title: string;
  body: string;
  category: string;
  mediaType: string;
  textBackground: TextBackgroundId;
  imagePreview?: string | null;
  videoPreview?: string | null;
  externalUrl?: string;
  documentName?: string;
  galleryPreviews?: string[];
}

export function NewsFormPreview({
  title,
  body,
  category,
  mediaType,
  textBackground,
  imagePreview,
  videoPreview,
  externalUrl = "",
  documentName,
  galleryPreviews = [],
}: NewsFormPreviewProps) {
  const cat = NEWS_CATEGORIES.find((c) => c.value === category);
  const hasBg = mediaType === "text" && textBackground !== "none";
  const yt = mediaType === "video" && !videoPreview && externalUrl ? toYoutubeEmbedUrl(externalUrl) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 p-4">
        <Avatar name="Jeunesse Parle" size="sm" />
        <div>
          <p className="text-sm font-semibold text-slate-900">Jeunesse Parle 🇨🇩</p>
          <p className="text-xs text-slate-400">À l&apos;instant · Aperçu</p>
        </div>
        {cat?.badge ? (
          <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold", CATEGORY_STYLES[category as keyof typeof CATEGORY_STYLES])}>
            {cat.badge}
          </span>
        ) : null}
      </header>

      <div className="space-y-3 p-4">
        {hasBg ? (
          <TextBackgroundBanner backgroundId={textBackground} body={body || title || "Votre message…"} compact />
        ) : (
          <>
            {title ? <h3 className="font-semibold text-slate-900">{title}</h3> : null}
            {body ? (
              <RichTextContent content={body} />
            ) : (
              <p className="text-sm italic text-slate-400">Le contenu apparaîtra ici…</p>
            )}
          </>
        )}

        {mediaType === "image" && imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreview} alt="" className="rounded-xl object-cover" />
        ) : null}

        {mediaType === "video" && videoPreview ? (
          <video src={videoPreview} controls className="aspect-video w-full rounded-xl bg-slate-900" />
        ) : null}

        {yt ? (
          <div className="overflow-hidden rounded-xl bg-slate-900">
            <iframe
              src={yt}
              title="Vidéo"
              className="aspect-video w-full"
              allow={YOUTUBE_IFRAME_ALLOW}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : null}

        {mediaType === "link" && externalUrl ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
            <Play className="h-3.5 w-3.5 rotate-45" />
            {externalUrl}
          </div>
        ) : null}

        {mediaType === "document" && documentName ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
            <FileText className="h-8 w-8 text-red-500" />
            <span className="truncate text-sm font-medium text-slate-800">{documentName}</span>
          </div>
        ) : null}

        {galleryPreviews.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {galleryPreviews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
        ) : null}
      </div>

      <footer className="flex gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
        <span>❤️ J&apos;aime</span>
        <span>💬 Commenter</span>
        <span>↗ Partager</span>
      </footer>
    </article>
  );
}
