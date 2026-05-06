export const colors = {
  primary: '#008943',
  primaryDark: '#006B34',
  primaryLight: '#1FAE63',
  accent: '#F15A29',
  accentLight: '#FF7A4D',
  yellow: '#F9C23C',
  brown: '#5B3A17',
  cream: '#FFF7E6',
  bg: '#FFFBF2',
  surface: '#FFFFFF',
  border: '#EFE7D2',
  text: '#1F1F1F',
  textMuted: '#7A7568',
  textSoft: '#A39B85',
  success: '#008943',
  danger: '#F15A29',
  warning: '#F9C23C',
  shadow: 'rgba(91,58,23,0.08)',
} as const;

export type ColorKey = keyof typeof colors;
