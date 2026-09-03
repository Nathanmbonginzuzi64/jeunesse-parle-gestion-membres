"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Download, ExternalLink, MapPin, Play, X, ZoomIn } from "lucide-react";
import Link from "next/link";
import { useProtectedImage } from "@/lib/hooks";
import { ApiError, downloadProtectedUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NewsPostItem } from "@/lib/news/constants";
import { toYoutubeEmbedUrl, YOUTUBE_IFRAME_ALLOW } from "@/lib/news/youtube";
import { useToast } from "@/components/ui/toast";

export function NewsMediaBlock({ post, compact = false }: { post: NewsPostItem; compact?: boolean }) {
  const mainSrc = useProtectedImage(post.media_url);
  const hasImage = post.media_type === "image" && post.media_url;
  const hasGallery = (post.gallery_urls?.length ?? 0) > 0;
  const spacing = compact ? "mt-3" : "mt-4";
  const [lightbox, setLightbox] = useState<{ src: string; title: string; downloadUrl?: string } | null>(null);

  if (post.media_type === "video") {
    if (post.media_url) {
      return (
        <div className={cn("space-y-2", spacing)}>
          <ProtectedVideo
            url={post.media_url}
            title={post.title}
            compact={compact}
            downloadName={`actualite-${post.id}-video.mp4`}
          />
          {hasGallery ? (
            <GalleryGrid
              urls={post.gallery_urls!}
              compact={compact}
              postId={post.id}
              onOpen={(src, downloadUrl, title) => setLightbox({ src, downloadUrl, title })}
            />
          ) : null}
          <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
        </div>
      );
    }

    if (post.external_url) {
      const embed = toYoutubeEmbedUrl(post.external_url);
      return (
        <div className={cn("space-y-2", spacing)}>
          {embed ? (
            <div className="overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-800">
              <iframe
                src={embed}
                title={post.title}
                className="aspect-video w-full"
                allow={YOUTUBE_IFRAME_ALLOW}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <a
              href={post.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 transition hover:bg-red-100"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                <Play className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block">Ouvrir la vidéo</span>
                <span className="block truncate text-xs font-normal text-red-600/80">{post.external_url}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-60" />
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={post.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir sur YouTube
            </a>
          </div>
          {hasGallery ? (
            <GalleryGrid
              urls={post.gallery_urls!}
              compact={compact}
              postId={post.id}
              onOpen={(src, downloadUrl, title) => setLightbox({ src, downloadUrl, title })}
            />
          ) : null}
          <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
        </div>
      );
    }
  }

  if (post.media_type === "link" && post.external_url) {
    return (
      <a
        href={post.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 hover:bg-brand-100",
          spacing,
        )}
      >
        🔗 {post.external_url}
      </a>
    );
  }

  if (post.media_type === "document" && post.media_url) {
    return (
      <div className={cn("space-y-2", spacing)}>
        <ProtectedDownloadButton
          url={post.media_url}
          filename={`actualite-${post.id}.pdf`}
          label="Télécharger le document PDF"
          variant="document"
        />
      </div>
    );
  }

  if (!hasImage && !hasGallery && !mainSrc) return null;

  return (
    <div className={cn("space-y-2", spacing)}>
      {hasImage || mainSrc ? (
        <ProtectedImageFrame
          src={mainSrc}
          remoteUrl={post.media_url}
          title={post.title}
          compact={compact}
          downloadName={`actualite-${post.id}-image.jpg`}
          onOpen={(src) =>
            setLightbox({
              src,
              title: post.title,
              downloadUrl: post.media_url ?? undefined,
            })
          }
        />
      ) : null}
      {hasGallery ? (
        <GalleryGrid
          urls={post.gallery_urls!}
          compact={compact}
          postId={post.id}
          onOpen={(src, downloadUrl, title) => setLightbox({ src, downloadUrl, title })}
        />
      ) : null}
      <MediaLightbox state={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function GalleryGrid({
  urls,
  compact,
  postId,
  onOpen,
}: {
  urls: string[];
  compact: boolean;
  postId: number;
  onOpen: (src: string, downloadUrl: string, title: string) => void;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      {urls.map((url, index) => (
        <GalleryThumb
          key={url}
          url={url}
          compact={compact}
          title={`Photo ${index + 1}`}
          downloadName={`actualite-${postId}-galerie-${index + 1}.jpg`}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function ProtectedImageFrame({
  src,
  remoteUrl,
  title,
  compact,
  downloadName,
  onOpen,
}: {
  src: string | null;
  remoteUrl?: string | null;
  title: string;
  compact: boolean;
  downloadName: string;
  onOpen: (src: string) => void;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl bg-slate-200",
          compact ? "aspect-[16/10] max-h-72" : "aspect-video max-h-[420px]",
        )}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => onOpen(src)}
        className="group relative block w-full text-left"
        aria-label="Agrandir l'image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className={cn(
            "w-full object-cover transition duration-200 group-hover:brightness-95",
            compact ? "max-h-72" : "max-h-[420px]",
          )}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
            <ZoomIn className="h-3.5 w-3.5" />
            Voir
          </span>
        </span>
      </button>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => onOpen(src)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
        >
          <ZoomIn className="h-3.5 w-3.5" />
          Voir en grand
        </button>
        {remoteUrl ? (
          <ProtectedDownloadButton url={remoteUrl} filename={downloadName} label="Télécharger" />
        ) : null}
      </div>
    </div>
  );
}

function GalleryThumb({
  url,
  compact = false,
  title,
  downloadName,
  onOpen,
}: {
  url: string;
  compact?: boolean;
  title: string;
  downloadName: string;
  onOpen: (src: string, downloadUrl: string, title: string) => void;
}) {
  const src = useProtectedImage(url);
  if (!src) {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-slate-100", compact ? "aspect-[4/3]" : "aspect-square")}
      />
    );
  }
  return (
    <div className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => onOpen(src, url, title)}
        className="block w-full"
        aria-label={`Voir ${title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className={cn("w-full object-cover", compact ? "aspect-[4/3]" : "aspect-square")}
        />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onOpen(src, url, title)}
          className="rounded-md bg-white/90 p-1.5 text-slate-800"
          aria-label="Voir"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <ProtectedDownloadButton url={url} filename={downloadName} iconOnly />
      </div>
    </div>
  );
}

function ProtectedVideo({
  url,
  title,
  compact = false,
  downloadName,
}: {
  url: string;
  title: string;
  compact?: boolean;
  downloadName: string;
}) {
  const src = useProtectedImage(url);
  if (!src) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl bg-slate-200",
          compact ? "aspect-video max-h-72" : "aspect-video",
        )}
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-800">
      <video
        src={src}
        controls
        preload="metadata"
        title={title}
        className="aspect-video w-full"
      />
      <div className="flex flex-wrap gap-2 border-t border-slate-800 bg-slate-950 px-3 py-2">
        <ProtectedDownloadButton
          url={url}
          filename={downloadName}
          label="Télécharger la vidéo"
          dark
        />
      </div>
    </div>
  );
}

function ProtectedDownloadButton({
  url,
  filename,
  label = "Télécharger",
  variant = "default",
  iconOnly = false,
  dark = false,
}: {
  url: string;
  filename: string;
  label?: string;
  variant?: "default" | "document";
  iconOnly?: boolean;
  dark?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const ext = guessExtension(url, filename);
      const name = filename.includes(".") ? filename : `${filename}.${ext}`;
      await downloadProtectedUrl(url, name);
      toast.success("Téléchargement démarré.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Téléchargement impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="rounded-md bg-white/90 p-1.5 text-slate-800 disabled:opacity-60"
        aria-label={label}
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (variant === "document") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
      >
        📄 {busy ? "Téléchargement…" : label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleDownload()}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
        dark
          ? "bg-white/10 text-white hover:bg-white/20"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      <Download className="h-3.5 w-3.5" />
      {busy ? "…" : label}
    </button>
  );
}

function MediaLightbox({
  state,
  onClose,
}: {
  state: { src: string; title: string; downloadUrl?: string } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [state, onClose]);

  if (!state || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-zoom-out" aria-label="Fermer" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-medium">{state.title}</p>
          <div className="flex shrink-0 items-center gap-2">
            {state.downloadUrl ? (
              <ProtectedDownloadButton
                url={state.downloadUrl}
                filename={state.title.replace(/\s+/g, "-").toLowerCase() || "image"}
                label="Télécharger"
                dark
              />
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.src}
          alt={state.title}
          className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body,
  );
}

function guessExtension(url: string, fallbackName: string): string {
  const fromName = fallbackName.split(".").pop();
  if (fromName && fromName !== fallbackName && fromName.length <= 5) return fromName;
  const path = url.split("?")[0] ?? url;
  const match = /\.([a-z0-9]+)$/i.exec(path);
  if (match) return match[1].toLowerCase();
  if (url.includes("/file")) return "bin";
  return "jpg";
}

export function NewsActivityBlock({ activity }: { activity: NonNullable<NewsPostItem["activity"]> }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Activité associée</p>
      <p className="mt-1 font-medium text-slate-900">{activity.title}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        {activity.starts_at ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateTime(activity.starts_at)}
          </span>
        ) : null}
        {activity.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {activity.location}
          </span>
        ) : null}
      </div>
      <Link
        href={`/activites/${activity.id}`}
        className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Voir l&apos;activité · S&apos;inscrire
      </Link>
    </div>
  );
}
