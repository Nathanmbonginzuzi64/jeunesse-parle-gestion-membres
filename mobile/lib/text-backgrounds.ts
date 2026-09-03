/** Fonds de publication texte — mêmes presets que le web. */

export type TextBackgroundId =
  | 'none'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'royal'
  | 'rdc'
  | 'night'
  | 'coral'
  | 'mint'
  | 'lavender'
  | 'sky'
  | 'fire';

export type TextBackgroundPreset = {
  id: TextBackgroundId;
  label: string;
  colors: string[];
  textColor: string;
};

export const TEXT_BACKGROUNDS: TextBackgroundPreset[] = [
  {
    id: 'none',
    label: 'Classique',
    colors: ['#FFFFFF', '#F8FAFC'],
    textColor: '#1E293B',
  },
  {
    id: 'ocean',
    label: 'Océan',
    colors: ['#2563EB', '#06B6D4', '#2DD4BF'],
    textColor: '#FFFFFF',
  },
  {
    id: 'sunset',
    label: 'Coucher de soleil',
    colors: ['#F97316', '#F43F5E', '#9333EA'],
    textColor: '#FFFFFF',
  },
  {
    id: 'forest',
    label: 'Forêt',
    colors: ['#047857', '#16A34A', '#84CC16'],
    textColor: '#FFFFFF',
  },
  {
    id: 'royal',
    label: 'Royal',
    colors: ['#4338CA', '#7C3AED', '#A855F7'],
    textColor: '#FFFFFF',
  },
  {
    id: 'rdc',
    label: 'RDC',
    colors: ['#0284C7', '#1D4ED8', '#DC2626'],
    textColor: '#FFFFFF',
  },
  {
    id: 'night',
    label: 'Nuit',
    colors: ['#0F172A', '#1E293B', '#312E81'],
    textColor: '#FFFFFF',
  },
  {
    id: 'coral',
    label: 'Corail',
    colors: ['#FB7185', '#EC4899', '#D946EF'],
    textColor: '#FFFFFF',
  },
  {
    id: 'mint',
    label: 'Menthe',
    colors: ['#2DD4BF', '#34D399', '#67E8F9'],
    textColor: '#0F172A',
  },
  {
    id: 'lavender',
    label: 'Lavande',
    colors: ['#C4B5FD', '#D8B4FE', '#F5D0FE'],
    textColor: '#0F172A',
  },
  {
    id: 'sky',
    label: 'Ciel',
    colors: ['#38BDF8', '#60A5FA', '#818CF8'],
    textColor: '#FFFFFF',
  },
  {
    id: 'fire',
    label: 'Flamme',
    colors: ['#FACC15', '#F97316', '#DC2626'],
    textColor: '#FFFFFF',
  },
];

export function resolveTextBackgroundId(
  value?: string | Record<string, unknown> | null,
): TextBackgroundId {
  if (!value) return 'none';
  if (typeof value === 'string') {
    if (value === 'none' || value === '') return 'none';
    if (value.startsWith('bg:')) {
      return resolveTextBackgroundId(value.slice(3));
    }
    const found = TEXT_BACKGROUNDS.find((b) => b.id === value);
    return found ? found.id : 'none';
  }
  const nested =
    (value as { id?: string; background?: string; name?: string }).id ||
    (value as { background?: string }).background ||
    (value as { name?: string }).name;
  return resolveTextBackgroundId(nested ?? null);
}

export function getTextBackground(
  id?: string | Record<string, unknown> | null,
): TextBackgroundPreset {
  const resolved = resolveTextBackgroundId(id);
  return TEXT_BACKGROUNDS.find((b) => b.id === resolved) ?? TEXT_BACKGROUNDS[0];
}

export function hasTextBackground(
  mediaType?: string | null,
  textBackground?: string | Record<string, unknown> | null,
) {
  if ((mediaType ?? 'text').toLowerCase() !== 'text') return false;
  const id = resolveTextBackgroundId(textBackground);
  return id !== 'none';
}
