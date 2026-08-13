/**
 * @deprecated Prefer Tailwind classes via NativeWind (see tailwind.config.js).
 * These JS values are kept only for props that don't accept className
 * (e.g., Ionicons `color`, ActivityIndicator `color`).
 */
export const colors = {
  background: '#F3F5EF',
  surface: '#FFFFFF',
  surfaceMuted: '#E8ECE4',
  ink: '#17231D',
  muted: '#5E6D64',
  border: '#D4DBD2',
  leaf: '#2F6B4F',
  leafDark: '#1D4D37',
  leafSoft: '#DCEADF',
  amber: '#9A5B10',
  amberSoft: '#F6E8CF',
  danger: '#A33737',
  dangerSoft: '#F5DEDE',
  overlay: 'rgba(10, 22, 15, 0.55)',
} as const;
