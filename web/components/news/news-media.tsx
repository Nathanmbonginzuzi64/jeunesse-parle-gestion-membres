"use client";

import { Calendar, ExternalLink, MapPin, Play } from "lucide-react";
import Link from "next/link";
import { useProtectedImage } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { NewsPostItem } from "@/lib/news/constants";
import { toYoutubeEmbedUrl, YOUTUBE_IFRAME_ALLOW } from "@/lib/news/youtube";

export function NewsMediaBlock({ post, compact = false }: { post: NewsPostItem; compact?: boolean }) {
  const mainSrc = useProtectedImage(post.media_url);
  const hasImage = post.media_type === "image" && post.media_url;
  const hasGallery = (post.gallery_urls?.length ?? 0) > 0;
  const spacing = compact ? "mt-3" : "mt-4";

  if (post.media_type === "video") {
    if (post.media_url) {
      return (
        <div className={cn("space-y-2", spacing)}>
          <ProtectedVideo url={post.media_url} title={post.title} compact={compact} />
          {hasGallery ? (
            <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              {post.gallery_urls!.map((url) => (
                <GalleryThumb key={url} url={url} compact={compact} />
              ))}
            </div>
          ) : null}
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
          {hasGallery ? (
            <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
              {post.gallery_urls!.map((url) => (
                <GalleryThumb key={url} url={url} compact={compact} />
              ))}
            </div>
          ) : null}
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
      <a
        href={post.media_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100",
          spacing,
        )}
      >
        📄 Télécharger le document PDF
      </a>
    );
  }

  if (!hasImage && !hasGallery && !mainSrc) return null;

  return (
    <div className={cn("space-y-2", spacing)}>
      {hasImage ? (
        mainSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainSrc}
            alt=""
            className={cn("w-full rounded-xl object-cover", compact ? "max-h-72" : "max-h-[420px]")}
          />
        ) : (
          <div
            className={cn(
              "animate-pulse rounded-xl bg-slate-200",
              compact ? "aspect-[16/10] max-h-72" : "aspect-video max-h-[420px]",
            )}
          />
        )
      ) : mainSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mainSrc}
          alt=""
          className={cn("w-full rounded-xl object-cover", compact ? "max-h-72" : "max-h-[420px]")}
        />
      ) : null}
      {hasGallery ? (
        <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
          {post.gallery_urls!.map((url) => (
            <GalleryThumb key={url} url={url} compact={compact} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryThumb({ url, compact = false }: { url: string; compact?: boolean }) {
  const src = useProtectedImage(url);
  if (!src) {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-slate-100", compact ? "aspect-[4/3]" : "aspect-square")}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("w-full rounded-lg object-cover", compact ? "aspect-[4/3]" : "aspect-square")}
    />
  );
}

function ProtectedVideo({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
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
    <video
      src={src}
      controls
      preload="metadata"
      title={title}
      className="aspect-video w-full rounded-xl bg-slate-900"
    />
  );
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
