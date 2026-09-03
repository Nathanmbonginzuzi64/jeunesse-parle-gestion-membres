export type CardRender = {
  organization?: string;
  country?: string;
  member_code?: string;
  full_name?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string | null;
  photo_url?: string | null;
  structure?: string | null;
  province?: string | null;
  city?: string | null;
  commune?: string | null;
  position?: string | null;
  status?: string;
  card_status?: string;
  card_status_label?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  verification_url?: string | null;
  qr_svg?: string | null;
};

/** Couleurs alignées sur le design system web (globals.css). */
export const CARD = {
  brand50: '#e7f4fb',
  brand500: '#0087d1',
  brand600: '#0076b8',
  brand700: '#00649c',
  brand800: '#0a4f7a',
  brand900: '#0a3d5c',
  brand950: '#072a40',
  flagRed: '#ce1126',
  flagYellow: '#fad201',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate700: '#334155',
  white: '#ffffff',
  border: 'rgba(226, 232, 240, 0.8)',
};

/** Ratio carte bancaire — identique au web (`aspect-[1.586/1]`). */
export const CARD_ASPECT = 1.586;

/** Dimensions communes recto / verso. */
export function cardFaceSize(width: number) {
  return { width, height: Math.round((width / CARD_ASPECT) * 10) / 10 };
}

export function formatCardDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function structureLine(render: CardRender) {
  const left = render.commune ?? render.city;
  if (left && render.structure) return `${left} / ${render.structure}`;
  return render.structure ?? left ?? render.province ?? null;
}

export function validityLine(render: CardRender) {
  if (!render.issued_at && !render.expires_at) return null;
  return `${formatCardDate(render.issued_at)} – ${formatCardDate(render.expires_at)}`;
}

export function isActiveStatus(status?: string | null) {
  const normalized = (status ?? '').toLowerCase();
  return normalized.includes('actif') || normalized === 'active';
}

export function isCertifiedCard(render: CardRender) {
  return render.card_status === 'active' && isActiveStatus(render.status);
}
