import { useTheme } from 'react-native-paper';
import type { AppTheme } from '../theme/paperTheme';

/** Typed accessor for the active Paper MD3 theme (see theme/paperTheme.ts). */
export function useAppTheme(): AppTheme {
  return useTheme<AppTheme>();
}
