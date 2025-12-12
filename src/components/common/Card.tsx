// Card Components - Reusable card layouts

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  noPadding = false,
}) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.md,
    },
    cardPadding: {
      padding: theme.spacing.lg,
    },
  }));

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.card, !noPadding && styles.cardPadding, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </CardComponent>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
  style?: ViewStyle;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
  style,
}) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerIcon: {
      fontSize: theme.fontSize.xxl,
      marginRight: theme.spacing.md,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerAction: {
      marginLeft: theme.spacing.md,
    },
  }));

  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerLeft}>
        {icon && <Text style={styles.headerIcon}>{icon}</Text>}
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && <View style={styles.headerAction}>{action}</View>}
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value: string | ReactNode;
  icon?: string;
  valueStyle?: TextStyle;
  style?: ViewStyle;
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  icon,
  valueStyle,
  style,
}) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    infoLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    infoIcon: {
      fontSize: theme.fontSize.lg,
      marginRight: theme.spacing.sm,
    },
    labelText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    valueText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
  }));

  return (
    <View style={[styles.infoRow, style]}>
      <View style={styles.infoLabel}>
        {icon && <Text style={styles.infoIcon}>{icon}</Text>}
        <Text style={styles.labelText}>{label}</Text>
      </View>
      {typeof value === 'string' ? (
        <Text style={[styles.valueText, valueStyle]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
};

interface DividerProps {
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({ style }) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
    },
  }));

  return <View style={[styles.divider, style]} />;
};

interface BadgeProps {
  text: string;
  color: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({ text, color, style, textStyle }) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    badge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.md,
    },
    badgeText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
    },
  }));

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, style]}>
      <Text style={[styles.badgeText, { color }, textStyle]}>{text}</Text>
    </View>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  onPress,
  style,
}) => {
  const styles = useThemedStyles((theme) => StyleSheet.create({
    statCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderLeftWidth: 4,
      ...theme.shadows.md,
    },
    statIcon: {
      fontSize: theme.fontSize.xxxl,
      marginBottom: theme.spacing.sm,
    },
    statLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    statValue: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
    },
  }));

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.statCard, { borderLeftColor: color }, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </CardComponent>
  );
};
