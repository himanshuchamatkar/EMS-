export interface ThemeColors {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  placeholder: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  statusDot: string;
  secondaryBg: string;
  secondaryInk: string;
  danger: string;
  good: string;
  goodSoft: string;
  warn: string;
  warnSoft: string;
  watermark: string;
}

// Matches the Stitch "Driver Authentication" mockup. Hand-picked from the
// provided screenshots (no design-token export was available) — nudge these
// if the real values come in later.
export const darkColors: ThemeColors = {
  mode: 'dark',
  bg: '#0A0E14',
  surface: '#12161F',
  surfaceAlt: '#1A2130',
  border: '#242C3B',
  borderStrong: '#323C4E',
  ink: '#F5F7FA',
  inkMuted: '#8B96AB',
  inkFaint: '#5B6479',
  placeholder: '#5B6479',
  accent: '#3B82F6',
  accentInk: '#8AB4FF',
  accentSoft: 'rgba(59,130,246,0.14)',
  statusDot: '#EF4444',
  secondaryBg: '#232A38',
  secondaryInk: '#CBD5E1',
  danger: '#F87171',
  good: '#34D399',
  goodSoft: 'rgba(16,185,129,0.14)',
  warn: '#FBBF24',
  warnSoft: 'rgba(245,158,11,0.14)',
  watermark: 'rgba(148,163,184,0.05)',
};

export const lightColors: ThemeColors = {
  mode: 'light',
  bg: '#EEF3FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5FB',
  border: '#DCE4F0',
  borderStrong: '#C7D2E3',
  ink: '#101828',
  inkMuted: '#5B6679',
  inkFaint: '#94A0B4',
  placeholder: '#94A0B4',
  accent: '#2563EB',
  accentInk: '#2563EB',
  accentSoft: '#DBEAFE',
  statusDot: '#DC2626',
  secondaryBg: '#E7ECF5',
  secondaryInk: '#40485C',
  danger: '#DC2626',
  good: '#059669',
  goodSoft: '#D1FAE5',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  watermark: 'rgba(37,99,235,0.045)',
};
