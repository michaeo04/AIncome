// ThemedTextInput - Standardized text input component with theme support

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { useThemeStore } from '../../stores/themeStore';

interface ThemedTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...textInputProps
}) => {
  const { theme } = useThemeStore();
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surfaceHover,
            borderWidth: 1,
            borderColor: hasError
              ? theme.colors.danger
              : isFocused
              ? theme.colors.primary
              : theme.colors.border,
            borderRadius: theme.borderRadius.md,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={[styles.iconContainer, { marginRight: theme.spacing.sm }]}>
            {leftIcon}
          </View>
        )}

        {/* Text Input */}
        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              fontSize: theme.fontSize.md,
              color: theme.colors.textPrimary,
            },
            style,
          ]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
        />

        {/* Right Icon */}
        {rightIcon && (
          <View style={[styles.iconContainer, { marginLeft: theme.spacing.sm }]}>
            {rightIcon}
          </View>
        )}
      </View>

      {/* Error Message */}
      {hasError && (
        <Text
          style={[
            styles.helperText,
            {
              fontSize: theme.fontSize.xs,
              color: theme.colors.danger,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}

      {/* Helper Text */}
      {!hasError && helperText && (
        <Text
          style={[
            styles.helperText,
            {
              fontSize: theme.fontSize.xs,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    // Dynamic styles from theme
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    // Dynamic styles from theme
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    // Dynamic styles from theme
  },
});

export default ThemedTextInput;
