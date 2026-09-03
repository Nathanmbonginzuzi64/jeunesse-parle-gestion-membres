/**
 * Couleurs Jeunesse Parle — mobile-first, contraste terrain.
 */
export const JP = {
  brand: '#0B5F4B',
  brandDark: '#084536',
  brandLight: '#E8F5F1',
  gold: '#C9A227',
  danger: '#B42318',
  success: '#027A48',
  warning: '#B54708',
  bg: '#F4F7F6',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
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
    text: '#ECEDEE',
    background: '#151718',
    tint: JP.brandLight,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: JP.brandLight,
  },
};

export const ROLE_SLUGS = {
  membre: 'membre',
  agentVerification: 'agent-verification',
  superAdmin: 'super-admin',
  adminNational: 'admin-national',
} as const;
