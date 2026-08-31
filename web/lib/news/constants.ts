/** Types et constantes du module JP Actualités. */

export type NewsCategory =
  | "general"
  | "official"
  | "activity"
  | "training"
  | "opportunity"
  | "press";

export type NewsReactionType = "like" | "love" | "support" | "important" | "celebrate" | "sad";

export type NewsPostStatus = "published" | "draft" | "archived";

export interface NewsActivityRef {
  id: number;
  title: string;
  code: string;
  starts_at?: string | null;
  location?: string | null;
}

export interface NewsCommentItem {
  id: number;
  body: string;
  author: string;
  parent_id?: number | null;
  created_at: string;
  replies?: NewsCommentItem[];
}

export interface NewsPostItem {
  id: number;
  title: string;
  body: string;
  category: NewsCategory;
  category_label: string;
  category_badge: string;
  media_type?: string;
  media_url?: string | null;
  gallery_urls?: string[];
  external_url?: string | null;
  text_background?: string | null;
  author?: string;
  author_role?: string;
  activity?: NewsActivityRef | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  my_reaction?: NewsReactionType | null;
  reactions?: Record<string, number>;
  created_at: string;
  status?: NewsPostStatus;
  is_published?: boolean;
  comments?: NewsCommentItem[];
}

export const NEWS_CATEGORIES: Array<{ value: NewsCategory | "all"; label: string; badge?: string }> = [
  { value: "all", label: "Toutes" },
  { value: "official", label: "Officielles", badge: "📢 OFFICIEL" },
  { value: "activity", label: "Activités", badge: "📅 ACTIVITÉ" },
  { value: "training", label: "Formations", badge: "🎓 FORMATION" },
  { value: "opportunity", label: "Opportunités", badge: "🚀 OPPORTUNITÉ" },
  { value: "press", label: "Communiqués", badge: "📰 COMMUNIQUÉ" },
];

export const NEWS_REACTIONS: Array<{ type: NewsReactionType; emoji: string; label: string }> = [
  { type: "like", emoji: "❤️", label: "J'aime" },
  { type: "support", emoji: "👍", label: "Soutien" },
  { type: "important", emoji: "🔥", label: "Important" },
  { type: "celebrate", emoji: "👏", label: "Bravo" },
  { type: "sad", emoji: "😢", label: "Triste" },
];

export const CATEGORY_STYLES: Record<NewsCategory, string> = {
  general: "bg-slate-100 text-slate-700",
  official: "bg-blue-100 text-blue-800",
  activity: "bg-emerald-100 text-emerald-800",
  training: "bg-violet-100 text-violet-800",
  opportunity: "bg-amber-100 text-amber-800",
  press: "bg-rose-100 text-rose-800",
};
