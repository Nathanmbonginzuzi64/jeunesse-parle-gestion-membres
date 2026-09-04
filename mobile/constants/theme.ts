/**
 * Couleurs Jeunesse Parle — thème clair.
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
  white: string;
  onBrand: string;
  validBg: string;
};

export const JP: JpColors = {
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

/** Compatibilité composants template Expo. */
export const Colors = {
  light: {
    text: JP.text,
    background: JP.bg,
    tint: JP.brand,
    icon: JP.muted,
    tabIconDefault: JP.muted,
    tabIconSelected: JP.brand,
  },
  dark: {
    text: JP.text,
    background: JP.bg,
    tint: JP.brand,
    icon: JP.muted,
    tabIconDefault: JP.muted,
    tabIconSelected: JP.brand,
  },
};

export const ROLE_SLUGS = {
  membre: 'membre',
  agentVerification: 'agent-verification',
  superAdmin: 'super-admin',
  adminNational: 'admin-national',
} as const;
