import { API_BASE_URL } from "@/lib/api";

export interface HomePost {
  id: number;
  title: string;
  excerpt: string | null;
  body: string | null;
  category: string | null;
  external_url: string | null;
  published_at: string | null;
  image_url: string | null;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  liked_by_me?: boolean;
  is_published?: boolean;
  sort_order?: number;
  author?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface HomePostComment {
  id: number;
  parent_id?: number | null;
  author_name: string;
  body: string;
  created_at: string | null;
  replies?: HomePostComment[];
  replies_count?: number;
}

export interface HomePostsPage {
  data: HomePost[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface HomePostCommentsPage {
  data: HomePostComment[];
  meta: HomePostsPage["meta"];
  comments_count: number;
}

const VISITOR_KEY = "jp.visitor";

export function getVisitorKey(): string {
  if (typeof window === "undefined") return "server";
  try {
    let key = window.localStorage.getItem(VISITOR_KEY);
    if (!key || !/^[A-Za-z0-9_-]{8,64}$/.test(key)) {
      key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "")
          : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(VISITOR_KEY, key);
    }
    return key.slice(0, 64);
  } catch {
    return `v${Date.now().toString(36)}`;
  }
}

function visitorHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Visitor-Key": getVisitorKey(),
  };
}

export async function getPublicHomePostsPage(
  page = 1,
  perPage = 12,
): Promise<HomePostsPage> {
  const empty: HomePostsPage = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
  };

  try {
    const response = await fetch(
      `${API_BASE_URL}/public/home-posts?page=${page}&per_page=${perPage}`,
      typeof window === "undefined"
        ? { next: { revalidate: 30 } }
        : { cache: "no-store" },
    );

    if (!response.ok) return empty;

    const payload = (await response.json()) as Partial<HomePostsPage>;
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      meta: {
        current_page: Number(payload.meta?.current_page ?? page),
        last_page: Math.max(1, Number(payload.meta?.last_page ?? 1)),
        per_page: Number(payload.meta?.per_page ?? perPage),
        total: Number(payload.meta?.total ?? 0),
      },
    };
  } catch {
    return empty;
  }
}

export async function getPublicHomePosts(limit = 50): Promise<HomePost[]> {
  const page = await getPublicHomePostsPage(1, Math.min(limit, 48));
  return page.data;
}

export async function getPublicHomePost(
  id: number | string,
  options?: { silent?: boolean },
): Promise<HomePost | null> {
  try {
    const silent = Boolean(options?.silent);
    const url = `${API_BASE_URL}/public/home-posts/${id}${silent ? "?silent=1" : ""}`;
    const response = await fetch(url, {
      headers: {
        ...visitorHeaders(),
        ...(silent ? { "X-Silent-Refresh": "1" } : {}),
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: HomePost };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function getPublicHomePostComments(
  id: number | string,
  page = 1,
  perPage = 8,
  options?: { silent?: boolean },
): Promise<HomePostCommentsPage> {
  const empty: HomePostCommentsPage = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
    comments_count: 0,
  };

  try {
    const silent = Boolean(options?.silent);
    const response = await fetch(
      `${API_BASE_URL}/public/home-posts/${id}/comments?page=${page}&per_page=${perPage}`,
      {
        headers: {
          ...visitorHeaders(),
          ...(silent ? { "X-Silent-Refresh": "1" } : {}),
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return empty;
    const payload = (await response.json()) as Partial<HomePostCommentsPage>;
    return {
      data: Array.isArray(payload.data) ? payload.data : [],
      meta: {
        current_page: Number(payload.meta?.current_page ?? page),
        last_page: Math.max(1, Number(payload.meta?.last_page ?? 1)),
        per_page: Number(payload.meta?.per_page ?? perPage),
        total: Number(payload.meta?.total ?? 0),
      },
      comments_count: Number(payload.comments_count ?? 0),
    };
  } catch {
    return empty;
  }
}

export async function likeHomePost(
  id: number,
  remove = false,
): Promise<{ likes_count: number; liked_by_me: boolean }> {
  const response = await fetch(`${API_BASE_URL}/public/home-posts/${id}/like`, {
    method: "POST",
    headers: visitorHeaders(),
    body: JSON.stringify({ remove }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "Impossible d'enregistrer le like.");
  }
  return {
    likes_count: Number((payload as { likes_count?: number }).likes_count ?? 0),
    liked_by_me: Boolean((payload as { liked_by_me?: boolean }).liked_by_me),
  };
}

export async function commentHomePost(
  id: number,
  data: { author_name: string; author_email?: string; body: string; parent_id?: number },
): Promise<{ comment: HomePostComment; comments_count: number }> {
  const response = await fetch(`${API_BASE_URL}/public/home-posts/${id}/comments`, {
    method: "POST",
    headers: visitorHeaders(),
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errors = (payload as { errors?: Record<string, string[]> }).errors;
    const first = errors ? Object.values(errors).flat()[0] : undefined;
    throw new Error(first || (payload as { message?: string }).message || "Commentaire refusé.");
  }
  return {
    comment: (payload as { data: HomePostComment }).data,
    comments_count: Number((payload as { comments_count?: number }).comments_count ?? 0),
  };
}

export async function shareHomePost(
  id: number,
  channel = "link",
): Promise<{ shares_count: number }> {
  const response = await fetch(`${API_BASE_URL}/public/home-posts/${id}/share`, {
    method: "POST",
    headers: visitorHeaders(),
    body: JSON.stringify({ channel }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "Partage impossible.");
  }
  return { shares_count: Number((payload as { shares_count?: number }).shares_count ?? 0) };
}
