/**
 * Couleurs Jeunesse Parle — maquette mobile (bleu officiel + blanc).
 */
export const JP = {
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
