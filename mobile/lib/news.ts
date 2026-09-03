export type NewsReactionType =
  | 'like'
  | 'love'
  | 'support'
  | 'important'
  | 'celebrate'
  | 'sad';

export type NewsCommentItem = {
  id: number;
  body: string;
  author: string;
  user_id?: number | null;
  parent_id?: number | null;
  likes_count: number;
  liked?: boolean;
  created_at: string;
  updated_at?: string;
  replies?: NewsCommentItem[];
};

export type NewsPostItem = {
  id: number;
  title: string;
  body?: string | null;
  category?: string;
  category_label?: string | null;
  category_badge?: string | null;
  media_type?: string | null;
  media_url?: string | null;
  gallery_urls?: string[] | null;
  external_url?: string | null;
  text_background?: string | Record<string, unknown> | null;
  author?: string | null;
  author_role?: string | null;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  my_reaction?: NewsReactionType | null;
  reactions?: Record<string, number>;
  created_at?: string | null;
  comments?: NewsCommentItem[];
};

export const NEWS_REACTIONS: Array<{
  type: NewsReactionType;
  emoji: string;
  label: string;
}> = [
  { type: 'like', emoji: '❤️', label: "J'aime" },
  { type: 'support', emoji: '👍', label: 'Soutien' },
  { type: 'important', emoji: '🔥', label: 'Important' },
  { type: 'celebrate', emoji: '👏', label: 'Bravo' },
  { type: 'sad', emoji: '😢', label: 'Triste' },
];

export function formatRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return date.toLocaleDateString('fr-FR');
}

export function formatCount(n?: number) {
  const value = Number(n ?? 0);
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')} k`;
  return String(value);
}
