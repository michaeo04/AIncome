// Empty State Component - Beautiful empty states with actions

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import ThemedButton from './ThemedButton';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  style,
}) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: theme.spacing.huge,
      paddingHorizontal: theme.spacing.xxxl,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: theme.borderRadius.round,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    icon: {
      fontSize: 56,
    },
    title: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    description: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.xxl,
    },
  }));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (
        <ThemedButton
          title={actionText}
          onPress={onAction}
          variant="primary"
        />
      )}
    </View>
  );
};
