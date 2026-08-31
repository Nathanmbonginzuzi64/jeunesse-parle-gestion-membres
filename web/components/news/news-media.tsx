"use client";

import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { useProtectedImage } from "@/lib/hooks";
import { formatDateTime } from "@/lib/utils";
import type { NewsPostItem } from "@/lib/news/constants";

export function NewsMediaBlock({ post }: { post: NewsPostItem }) {
  const mainSrc = useProtectedImage(post.media_url);

  if (post.media_type === "video" && post.external_url) {
    return (
      <div className="mt-4 overflow-hidden rounded-xl bg-slate-900">
        <iframe
          src={toEmbedUrl(post.external_url)}
          title={post.title}
          className="aspect-video w-full"
          allowFullScreen
        />
      </div>
    );
  }

  if (post.media_type === "link" && post.external_url) {
    return (
      <a
        href={post.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 hover:bg-brand-100"
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
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        📄 Télécharger le document PDF
      </a>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {mainSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mainSrc} alt="" className="max-h-[420px] w-full rounded-xl object-cover" />
      ) : null}
      {post.gallery_urls && post.gallery_urls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {post.gallery_urls.map((url, i) => (
            <GalleryThumb key={url} url={url} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GalleryThumb({ url }: { url: string }) {
  const src = useProtectedImage(url);
  if (!src) return <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
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

function toEmbedUrl(url: string): string {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1]?.split("?")[0];
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  return url;
}
