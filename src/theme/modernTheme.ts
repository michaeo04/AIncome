// Modern Theme Configuration
// Vibrant colors, consistent spacing, and modern design tokens

// ========================================
// LIGHT THEME COLORS
// ========================================
export const LIGHT_COLORS = {
  // Primary Brand Colors - Vibrant Blue Gradient
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  primaryGradient: ['#3B82F6', '#2563EB'],

  // Secondary Colors - Vibrant Purple
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#A78BFA',
  secondaryGradient: ['#8B5CF6', '#7C3AED'],

  // Success/Income - Vibrant Green
  success: '#10B981',
  successDark: '#059669',
  successLight: '#34D399',
  successGradient: ['#10B981', '#059669'],

  // Danger/Expense - Vibrant Red
  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#F87171',
  dangerGradient: ['#EF4444', '#DC2626'],

  // Warning - Vibrant Amber
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',
  warningGradient: ['#F59E0B', '#D97706'],

  // Info - Vibrant Cyan
  info: '#06B6D4',
  infoDark: '#0891B2',
  infoLight: '#22D3EE',
  infoGradient: ['#06B6D4', '#0891B2'],

  // Neutral Colors - Modern Gray Scale
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHover: '#F3F4F6',
  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textWhite: '#FFFFFF',

  // Backwards Compatibility Aliases
  text: '#1F2937', // Alias for textPrimary
  white: '#FFFFFF', // Alias for surface

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
};

// ========================================
// DARK THEME COLORS
// ========================================
export const DARK_COLORS = {
  // Primary Brand Colors - Lighter in dark mode for better contrast
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryLight: '#93C5FD',
  primaryGradient: ['#60A5FA', '#3B82F6'],

  // Secondary Colors - Lighter Purple
  secondary: '#A78BFA',
  secondaryDark: '#8B5CF6',
  secondaryLight: '#C4B5FD',
  secondaryGradient: ['#A78BFA', '#8B5CF6'],

  // Success/Income - Lighter Green
  success: '#34D399',
  successDark: '#10B981',
  successLight: '#6EE7B7',
  successGradient: ['#34D399', '#10B981'],

  // Danger/Expense - Lighter Red
  danger: '#F87171',
  dangerDark: '#EF4444',
  dangerLight: '#FCA5A5',
  dangerGradient: ['#F87171', '#EF4444'],

  // Warning - Lighter Amber
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  warningLight: '#FCD34D',
  warningGradient: ['#FBBF24', '#F59E0B'],

  // Info - Lighter Cyan
  info: '#22D3EE',
  infoDark: '#06B6D4',
  infoLight: '#67E8F9',
  infoGradient: ['#22D3EE', '#06B6D4'],

  // Neutral Colors - Dark Gray Scale
  background: '#111827', // Very dark background
  surface: '#1F2937', // Slightly lighter surface
  surfaceHover: '#374151', // Hover state
  border: '#4B5563', // Border color
  borderDark: '#6B7280', // Darker border

  // Text Colors - Light text on dark background
  textPrimary: '#F9FAFB', // Almost white
  textSecondary: '#D1D5DB', // Light gray
  textTertiary: '#9CA3AF', // Medium gray
  textDisabled: '#6B7280', // Dark gray
  textWhite: '#FFFFFF', // Pure white

  // Backwards Compatibility Aliases
  text: '#F9FAFB', // Alias for textPrimary
  white: '#1F2937', // In dark mode, "white" surfaces are dark

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.75)', // Darker overlay for dark mode
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

// Default export for backwards compatibility
export const COLORS = LIGHT_COLORS;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
  full: 9999, // Alias for round (backwards compatibility)
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
  massive: 42,
};

export const FONT_WEIGHT = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Modern Card Styles
export const CARD_STYLES = {
  default: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  elevated: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  outlined: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
};

// Modern Button Styles
export const BUTTON_STYLES = {
  primary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.sm,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.sm,
  },
  success: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.sm,
  },
  danger: {
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.sm,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
};

// Modern Header Styles (Based on Budget Screen)
export const HEADER_STYLES = {
  container: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
};

// Modern Empty State Styles
export const EMPTY_STATE_STYLES = {
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.huge,
    alignItems: 'center' as const,
    marginTop: SPACING.huge,
  },
  icon: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center' as const,
    marginBottom: SPACING.xxl,
  },
};

// Animation Durations
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
};

// Modern Gradient Helper
export const createGradient = (colors: string[]) => {
  return {
    colors,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  };
};

// Helper to add opacity to hex color
export const addOpacity = (hexColor: string, opacity: number): string => {
  const alpha = Math.round(opacity * 255);
  return `${hexColor}${alpha.toString(16).padStart(2, '0')}`;
};

// ========================================
// THEME TYPE DEFINITION
// ========================================
export type Theme = {
  colors: typeof LIGHT_COLORS;
  spacing: typeof SPACING;
  borderRadius: typeof BORDER_RADIUS;
  fontSize: typeof FONT_SIZE;
  fontWeight: typeof FONT_WEIGHT;
  shadows: typeof SHADOWS;
  cardStyles: typeof CARD_STYLES;
  buttonStyles: typeof BUTTON_STYLES;
  headerStyles: typeof HEADER_STYLES;
  emptyStateStyles: typeof EMPTY_STATE_STYLES;
  animation: typeof ANIMATION;
  isDark: boolean;
};

// ========================================
// THEME OBJECTS
// ========================================
export const lightTheme: Theme = {
  colors: LIGHT_COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  shadows: SHADOWS,
  cardStyles: CARD_STYLES,
  buttonStyles: BUTTON_STYLES,
  headerStyles: HEADER_STYLES,
  emptyStateStyles: EMPTY_STATE_STYLES,
  animation: ANIMATION,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: DARK_COLORS,
  spacing: SPACING,
  borderRadius: BORDER_RADIUS,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  shadows: SHADOWS,
  // Card styles need to use dark colors
  cardStyles: {
    default: {
      backgroundColor: DARK_COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOWS.md,
    },
    elevated: {
      backgroundColor: DARK_COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOWS.lg,
    },
    outlined: {
      backgroundColor: DARK_COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: DARK_COLORS.border,
    },
  },
  // Button styles with dark colors
  buttonStyles: {
    primary: {
      backgroundColor: DARK_COLORS.primary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      ...SHADOWS.sm,
    },
    secondary: {
      backgroundColor: DARK_COLORS.secondary,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      ...SHADOWS.sm,
    },
    success: {
      backgroundColor: DARK_COLORS.success,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      ...SHADOWS.sm,
    },
    danger: {
      backgroundColor: DARK_COLORS.danger,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      ...SHADOWS.sm,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderWidth: 2,
      borderColor: DARK_COLORS.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
    },
  },
  // Header styles with dark colors
  headerStyles: {
    container: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: SPACING.lg,
      backgroundColor: DARK_COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: DARK_COLORS.border,
    },
    title: {
      fontSize: FONT_SIZE.xxxl,
      fontWeight: FONT_WEIGHT.bold,
      color: DARK_COLORS.textPrimary,
    },
    subtitle: {
      fontSize: FONT_SIZE.sm,
      color: DARK_COLORS.textSecondary,
      marginTop: SPACING.xs,
    },
  },
  // Empty state styles with dark colors
  emptyStateStyles: {
    container: {
      backgroundColor: DARK_COLORS.surface,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.huge,
      alignItems: 'center' as const,
      marginTop: SPACING.huge,
    },
    icon: {
      fontSize: 64,
      marginBottom: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.semibold,
      color: DARK_COLORS.textPrimary,
      marginBottom: SPACING.sm,
    },
    subtitle: {
      fontSize: FONT_SIZE.sm,
      color: DARK_COLORS.textSecondary,
      textAlign: 'center' as const,
      marginBottom: SPACING.xxl,
    },
  },
  animation: ANIMATION,
  isDark: true,
};
