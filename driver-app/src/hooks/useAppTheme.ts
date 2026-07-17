import { useColorScheme } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from '../theme/colors';

/** Follows the OS light/dark setting; defaults to dark when unknown (web preview, old OS). */
export function useAppTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'light' ? lightColors : darkColors;
}
