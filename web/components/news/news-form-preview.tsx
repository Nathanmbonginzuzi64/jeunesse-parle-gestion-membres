"use client";

import { Avatar } from "@/components/ui/avatar";
import { TextBackgroundBanner } from "@/components/news/text-background-picker";
import { RichTextContent } from "@/components/news/rich-text-editor";
import { CATEGORY_STYLES, NEWS_CATEGORIES } from "@/lib/news/constants";
import type { TextBackgroundId } from "@/lib/news/text-backgrounds";
import { cn } from "@/lib/utils";

interface NewsFormPreviewProps {
  title: string;
  body: string;
  category: string;
  mediaType: string;
  textBackground: TextBackgroundId;
}

export function NewsFormPreview({ title, body, category, mediaType, textBackground }: NewsFormPreviewProps) {
  const cat = NEWS_CATEGORIES.find((c) => c.value === category);
  const hasBg = mediaType === "text" && textBackground !== "none";

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

      <div className="p-4">
        {hasBg ? (
          <TextBackgroundBanner backgroundId={textBackground} body={body || title || "Votre message…"} compact />
        ) : (
          <>
            {title ? <h3 className="font-semibold text-slate-900">{title}</h3> : null}
            {body ? (
              <div className="mt-2">
                <RichTextContent content={body} />
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">Le contenu apparaîtra ici…</p>
            )}
          </>
        )}
      </div>

      <footer className="flex gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-400">
        <span>❤️ J&apos;aime</span>
        <span>💬 Commenter</span>
        <span>↗ Partager</span>
      </footer>
    </article>
  );
}
