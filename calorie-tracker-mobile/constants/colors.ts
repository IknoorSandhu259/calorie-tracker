import { useColorScheme } from 'react-native'

export const lightColors = {
  isDark: false,
  // Backgrounds
  pageBg: '#fafafa',
  cardBg: '#ffffff',
  authBg: '#f4f4f5',
  inputBg: '#fafafa',
  // Text
  textPrimary: '#18181b',
  textSecondary: '#52525b',
  textMuted: '#71717a',
  textLabel: '#a1a1aa',
  // Borders
  border: '#e4e4e7',
  borderInput: '#d4d4d8',
  placeholder: '#d4d4d8',
  // Interactive
  primaryBg: '#18181b',
  primaryText: '#ffffff',
  // Semantic
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.08)',
  success: '#22c55e',
  // Chart / SVG
  chartLine: '#18181b',
  chartGrid: '#f4f4f5',
  chartTick: '#a1a1aa',
  // Tab bar
  tabBg: '#ffffff',
  tabBorder: '#f4f4f5',
  // Misc
  divider: '#e4e4e7',
  iconMuted: '#d4d4d8',
} as const

export const darkColors = {
  isDark: true,
  pageBg: '#09090b',
  cardBg: '#1c1c1e',
  authBg: '#09090b',
  inputBg: '#27272a',
  textPrimary: '#fafafa',
  textSecondary: '#d4d4d8',
  textMuted: '#a1a1aa',
  textLabel: '#71717a',
  border: '#3f3f46',
  borderInput: '#3f3f46',
  placeholder: '#52525b',
  primaryBg: '#fafafa',
  primaryText: '#09090b',
  error: '#f87171',
  errorBg: 'rgba(248,113,113,0.12)',
  success: '#4ade80',
  chartLine: '#e4e4e7',
  chartGrid: '#27272a',
  chartTick: '#71717a',
  tabBg: '#0a0a0a',
  tabBorder: '#27272a',
  divider: '#3f3f46',
  iconMuted: '#52525b',
} as const

export type AppColors =  | typeof lightColors  | typeof darkColors

export function useTheme(): AppColors {
  const scheme = useColorScheme()
  return scheme === 'dark' ? darkColors : lightColors
}
