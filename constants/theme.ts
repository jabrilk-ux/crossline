export const colors = {
  navy: '#0A1628', surface: '#0F1F36', surfaceRaised: '#152A47', steel: '#0F1F36',
  sky: '#2D6A9F', skyLight: '#5B9BD5', ice: '#E8F4FD', white: '#F2F6FB',
  text: '#F2F6FB', textSecondary: '#C8D4E3', muted: '#8FA3BD', dim: '#5C7291',
  slate: '#8FA3BD', silver: '#8FA3BD', success: '#34D27B', warning: '#F5B83D',
  danger: '#EF5B4C', border: '#1F3656', divider: '#1A3050',
} as const;
export const typography = {
  display: { fontFamily: 'Geist_600SemiBold', fontSize: 38 },
  h1: { fontFamily: 'Geist_600SemiBold', fontSize: 30 },
  h2: { fontFamily: 'Geist_600SemiBold', fontSize: 16 },
  body: { fontFamily: 'Geist_400Regular', fontSize: 15 },
  caption: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  mono: { fontFamily: 'GeistMono_400Regular', fontSize: 13 },
} as const;
export const statusColors = { allowed: colors.success, restricted: colors.warning, prohibited: colors.danger, unknown: '#718096' } as const;
const theme = { colors, typography, statusColors };
export type Colors = typeof colors;
export type Typography = typeof typography;
export type StatusColors = typeof statusColors;
export type Theme = typeof theme;
export default theme;
