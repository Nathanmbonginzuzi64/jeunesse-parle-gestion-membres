/** Extraction d'ID YouTube et URL d'embed (watch, youtu.be, shorts, embed). */

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

export function extractYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const u = new URL(withProtocol);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const fullHost = u.hostname.toLowerCase();

    if (!YOUTUBE_HOSTS.has(fullHost) && host !== "youtu.be" && !host.endsWith("youtube.com") && !host.endsWith("youtube-nocookie.com")) {
      return null;
    }

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return isValidYoutubeId(id) ? id : null;
    }

    const v = u.searchParams.get("v");
    if (isValidYoutubeId(v)) return v;

    const parts = u.pathname.split("/").filter(Boolean);
    const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
    if (embedIdx >= 0 && isValidYoutubeId(parts[embedIdx + 1])) {
      return parts[embedIdx + 1];
    }

    return null;
  } catch {
    return null;
  }
}

function isValidYoutubeId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^[\w-]{11}$/.test(id);
}

/** URL iframe YouTube, ou null si l'URL n'est pas une vidéo YouTube valide. */
export function toYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export const YOUTUBE_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
