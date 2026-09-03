"use client";

import { useMemo } from "react";
import { ExternalLink, Link2, Play, AlertCircle } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { extractYoutubeId, YOUTUBE_IFRAME_ALLOW } from "@/lib/news/youtube";
import { cn } from "@/lib/utils";

interface NewsUrlFieldProps {
  mode: "video" | "link";
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function NewsUrlField({ mode, value, onChange, error }: NewsUrlFieldProps) {
  const isVideo = mode === "video";
  const youtubeId = useMemo(() => (isVideo && value ? extractYoutubeId(value) : null), [isVideo, value]);
  const showInvalid = Boolean(value) && (isVideo ? !youtubeId : !isValidUrl(value));

  return (
    <div className="space-y-4">
      <Field
        label={isVideo ? "URL vidéo YouTube" : "Lien externe"}
        hint={isVideo ? "Collez le lien YouTube de la vidéo à partager" : "Site web, article, inscription en ligne…"}
        error={error}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {isVideo ? <Play className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </span>
          <Input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isVideo ? "https://www.youtube.com/watch?v=…" : "https://example.com"}
            className="pl-10"
          />
        </div>
      </Field>

      {showInvalid ? (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {isVideo
            ? "URL YouTube invalide — utilisez watch, youtu.be ou Shorts"
            : "URL invalide — vérifiez le format (https://…)"}
        </div>
      ) : null}

      {isVideo && youtubeId ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-md">
          <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2 text-xs text-slate-300">
            <Play className="h-3.5 w-3.5 text-red-400" />
            Aperçu YouTube
          </div>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="Aperçu vidéo"
            className="aspect-video w-full"
            allow={YOUTUBE_IFRAME_ALLOW}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}

      {!isVideo && value && isValidUrl(value) ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 transition hover:bg-brand-100",
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
            <ExternalLink className="h-5 w-5 text-brand-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase text-brand-600">Lien externe</p>
            <p className="truncate text-sm font-medium text-slate-800">{value}</p>
          </div>
        </a>
      ) : null}
    </div>
  );
}
