export const colors = {
  navy: '#0A1628',
  steel: '#1E3A5F',
  sky: '#2D6A9F',
  skyLight: '#5B9BD5',
  ice: '#E8F4FD',
  white: '#FFFFFF',
  slate: '#4A5568',
  silver: '#718096',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  border: '#CBD5E0',
} as const;

export const typography = {
  display: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
  },
  h1: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
  },
  h2: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  mono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
  },
} as const;

export const statusColors = {
  allowed: colors.success,
  restricted: colors.warning,
  prohibited: colors.danger,
  unknown: colors.silver,
} as const;

const theme = {
  colors,
  typography,
  statusColors,
} as const;

export type Colors = typeof colors;
export type Typography = typeof typography;
export type StatusColors = typeof statusColors;
export type Theme = typeof theme;

export default theme;
