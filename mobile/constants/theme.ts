/**
 * Couleurs Jeunesse Parle — clair / sombre.
 */
export type JpColors = {
  brand: string;
  brandDark: string;
  brandLight: string;
  gold: string;
  danger: string;
  success: string;
  warning: string;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  /** Surface claire (cartes, écrans) — sombre en mode dark. */
  white: string;
  /** Texte / icônes sur fond brand. */
  onBrand: string;
  /** Fond input valide. */
  validBg: string;
};

export const JP_LIGHT: JpColors = {
  brand: '#0087D1',
  brandDark: '#00649C',
  brandLight: '#E7F4FB',
  gold: '#F4C430',
  danger: '#DC3545',
  success: '#28A745',
  warning: '#B54708',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  text: '#102A43',
  muted: '#64748B',
  border: '#E8EEF4',
  white: '#FFFFFF',
  onBrand: '#FFFFFF',
  validBg: '#F0FDF4',
};

export const JP_DARK: JpColors = {
  brand: '#1AA0E8',
  brandDark: '#0087D1',
  brandLight: '#14324A',
  gold: '#F4C430',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  bg: '#0B1220',
  card: '#152033',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#243044',
  white: '#152033',
  onBrand: '#FFFFFF',
  validBg: '#0F2A1A',
};

/** Alias rétrocompat — palette claire par défaut. */
export const JP = JP_LIGHT;

/** Compatibilité composants template Expo. */
export const Colors = {
  light: {
    text: JP_LIGHT.text,
    background: JP_LIGHT.bg,
    tint: JP_LIGHT.brand,
    icon: JP_LIGHT.muted,
    tabIconDefault: JP_LIGHT.muted,
    tabIconSelected: JP_LIGHT.brand,
  },
  dark: {
    text: JP_DARK.text,
    background: JP_DARK.bg,
    tint: JP_DARK.brand,
    icon: JP_DARK.muted,
    tabIconDefault: JP_DARK.muted,
    tabIconSelected: JP_DARK.brand,
  },
};

export const ROLE_SLUGS = {
  membre: 'membre',
  agentVerification: 'agent-verification',
  superAdmin: 'super-admin',
  adminNational: 'admin-national',
} as const;
