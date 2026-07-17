import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * Color roles hand-derived from the Stitch "Citizen App" reference (Home
 * screen, potential-duplicate dialog, history screen). Dark is the
 * pixel-accurate target — every mockup provided so far is dark-mode only.
 * Light is a best-effort derived counterpart (same technique used for
 * driver-app's theme) so the app still behaves correctly if the OS is set to
 * light mode; treat it as provisional until a light Stitch reference exists.
 */
export const smartEmsDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#2DD4BF',
    onPrimary: '#023030',
    primaryContainer: '#0F3D3B',
    onPrimaryContainer: '#5EEAD4',
    secondary: '#8B96AB',
    onSecondary: '#0A0E14',
    secondaryContainer: '#1A2130',
    onSecondaryContainer: '#CBD5E1',
    error: '#EF4444',
    onError: '#FFFFFF',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FECACA',
    background: '#0A0E14',
    onBackground: '#F5F7FA',
    surface: '#12161F',
    onSurface: '#F5F7FA',
    surfaceVariant: '#1A2130',
    onSurfaceVariant: '#8B96AB',
    outline: '#323C4E',
    outlineVariant: '#242C3B',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: '#141A26',
      level2: '#171E2C',
      level3: '#1A2233',
    },
  },
};

export const smartEmsLightTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CCFBF1',
    onPrimaryContainer: '#134E4A',
    secondary: '#5B6679',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#EEF2F8',
    onSecondaryContainer: '#40485C',
    error: '#DC2626',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#7F1D1D',
    background: '#F4F7FB',
    onBackground: '#101828',
    surface: '#FFFFFF',
    onSurface: '#101828',
    surfaceVariant: '#EEF2F8',
    onSurfaceVariant: '#5B6679',
    outline: '#C7D2E3',
    outlineVariant: '#DCE4F0',
  },
};

export type AppTheme = typeof smartEmsDarkTheme;
