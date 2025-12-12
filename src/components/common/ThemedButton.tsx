// ThemedButton - Standardized button component with theme support

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { theme } = useThemeStore();

  // Get button colors based on variant
  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.textWhite,
          borderColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.secondary,
          textColor: theme.colors.textWhite,
          borderColor: theme.colors.secondary,
        };
      case 'success':
        return {
          backgroundColor: theme.colors.success,
          textColor: theme.colors.textWhite,
          borderColor: theme.colors.success,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.danger,
          textColor: theme.colors.textWhite,
          borderColor: theme.colors.danger,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.primary,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          textColor: theme.colors.textWhite,
          borderColor: theme.colors.primary,
        };
    }
  };

  // Get size-based padding and font size
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          fontSize: theme.fontSize.sm,
          iconSize: 16,
        };
      case 'medium':
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          fontSize: theme.fontSize.md,
          iconSize: 20,
        };
      case 'large':
        return {
          paddingVertical: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xxl,
          fontSize: theme.fontSize.lg,
          iconSize: 24,
        };
      default:
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          fontSize: theme.fontSize.md,
          iconSize: 20,
        };
    }
  };

  const colors = getButtonColors();
  const sizeStyles = getSizeStyles();

  const buttonStyle: ViewStyle = {
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    borderWidth: variant === 'outline' ? 2 : 0,
    borderRadius: theme.borderRadius.md,
    paddingVertical: sizeStyles.paddingVertical,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled || loading ? 0.5 : 1,
    ...(variant !== 'ghost' && theme.shadows.sm),
    ...(fullWidth && { width: '100%' }),
  };

  const textStyleComputed: TextStyle = {
    color: colors.textColor,
    fontSize: sizeStyles.fontSize,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={{ marginRight: theme.spacing.sm }}>{icon}</View>}
          <Text style={[textStyleComputed, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ThemedButton;
