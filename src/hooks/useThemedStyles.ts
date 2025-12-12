// useThemedStyles - Hook for creating theme-aware styles

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { Theme } from '../theme/modernTheme';

/**
 * Hook to create styles that depend on the current theme.
 * Automatically updates when theme changes.
 *
 * @example
 * const styles = useThemedStyles((theme) => StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing.lg,
 *   },
 *   title: {
 *     color: theme.colors.textPrimary,
 *     fontSize: theme.fontSize.xl,
 *     fontWeight: theme.fontWeight.bold,
 *   },
 * }));
 */
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  stylesFn: (theme: Theme) => T | StyleSheet.NamedStyles<T>
): T => {
  const { theme } = useThemeStore();

  return useMemo(() => stylesFn(theme) as T, [theme, stylesFn]);
};
