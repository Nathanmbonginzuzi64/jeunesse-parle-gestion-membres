export type JpCategory =
  | 'plainte'
  | 'suggestion'
  | 'doleance'
  | 'demande'
  | 'preoccupation';

export const JP_CATEGORIES: { value: JpCategory; label: string }[] = [
  { value: 'demande', label: 'Demande' },
  { value: 'plainte', label: 'Plainte' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'doleance', label: 'Doléance' },
  { value: 'preoccupation', label: 'Préoccupation' },
];

export type JpMessageReply = {
  id: number;
  body: string;
  author: string;
  is_admin: boolean;
  created_at: string;
};

export type JpMessageItem = {
  id: number;
  reference: string;
  subject: string;
  category: string;
  body: string;
  status: string;
  created_at: string;
  source?: 'member' | 'contact' | 'staff';
  author_label?: string;
  replies?: JpMessageReply[];
};

export type ChatContact = {
  id: number;
  name: string;
  role?: string | null;
  role_slug?: string | null;
  photo_url?: string | null;
  member_code?: string | null;
  scope?: string | null;
  group_id?: string;
  group_label?: string;
};

export type ChatConversationItem = {
  id: number;
  type?: string;
  kind?: string;
  subject?: string | null;
  title?: string | null;
  peer?: ChatContact | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  unread?: boolean;
  can_send?: boolean;
};

export function categoryLabel(value?: string | null) {
  return JP_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '—';
}

export function statusLabel(status?: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'open':
      return 'Ouvert';
    case 'in_progress':
      return 'En cours';
    case 'resolved':
      return 'Résolu';
    case 'closed':
      return 'Fermé';
    default:
      return status ?? '—';
  }
}

export function chatTitle(item: ChatConversationItem) {
  return item.peer?.name || item.title || item.subject || `Conversation #${item.id}`;
}

export function formatRelative(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
