// GoalAllocationCard - Individual goal card with allocation controls

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';
import { GoalProgressView } from '../../types';

interface GoalAllocationCardProps {
  goal: GoalProgressView;
  currency: string;
  onAllocate: (goal: GoalProgressView) => void;
  onWithdraw: (goal: GoalProgressView) => void;
  onPress?: (goal: GoalProgressView) => void;
}

const GoalAllocationCard: React.FC<GoalAllocationCardProps> = ({
  goal,
  currency,
  onAllocate,
  onWithdraw,
  onPress,
}) => {
  const progressPercent = Math.min(goal.progress_percent, 100);
  const canWithdraw = goal.allocated_amount > 0;

  // Get color based on progress
  const getProgressColor = () => {
    if (goal.is_completed) return COLORS.success;
    if (progressPercent >= 75) return COLORS.primary;
    if (progressPercent >= 50) return COLORS.secondary;
    if (progressPercent >= 25) return COLORS.warning;
    return COLORS.textSecondary;
  };

  // Get status badge
  const getStatusBadge = () => {
    if (goal.is_completed) {
      return { text: '✓ Completed', color: COLORS.success, bg: COLORS.successLight };
    }
    if (goal.days_remaining < 0) {
      return { text: '⏰ Overdue', color: COLORS.danger, bg: COLORS.dangerLight };
    }
    if (goal.days_remaining <= 7) {
      return { text: `${goal.days_remaining}d left`, color: COLORS.warning, bg: COLORS.warningLight };
    }
    if (goal.days_remaining <= 30) {
      return { text: `${goal.days_remaining}d left`, color: COLORS.primary, bg: COLORS.primaryLight };
    }
    const monthsLeft = Math.floor(goal.days_remaining / 30);
    return { text: `${monthsLeft}mo left`, color: COLORS.textSecondary, bg: COLORS.backgroundSecondary };
  };

  const status = getStatusBadge();
  const progressColor = getProgressColor();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(goal)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={styles.gradient}
      >
        {/* Header with Icon and Status */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
              <Text style={styles.icon}>{goal.icon}</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {goal.name}
              </Text>
              <Text style={styles.targetDate}>
                Target: {new Date(goal.target_date).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          {/* Amount Display */}
          <View style={styles.amountRow}>
            <Text style={styles.currentAmount}>
              {formatCurrency(goal.allocated_amount, currency)}
            </Text>
            <Text style={styles.amountSeparator}> / </Text>
            <Text style={styles.targetAmount}>
              {formatCurrency(goal.target_amount, currency)}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={[progressColor, progressColor + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={[styles.progressPercentText, { color: progressColor }]}>
              {progressPercent.toFixed(0)}%
            </Text>
          </View>

          {/* Remaining Amount */}
          <View style={styles.remainingContainer}>
            <Text style={styles.remainingLabel}>
              {goal.remaining_amount > 0 ? 'Remaining' : 'Exceeded by'}
            </Text>
            <Text style={[
              styles.remainingAmount,
              { color: goal.remaining_amount > 0 ? COLORS.textSecondary : COLORS.success }
            ]}>
              {formatCurrency(Math.abs(goal.remaining_amount), currency)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.allocateButton]}
            onPress={() => onAllocate(goal)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.allocateButtonText}>➕ Allocate</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.withdrawButton,
              !canWithdraw && styles.disabledButton,
            ]}
            onPress={() => onWithdraw(goal)}
            disabled={!canWithdraw}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.withdrawButtonText,
              !canWithdraw && styles.disabledButtonText,
            ]}>
              ➖ Withdraw
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note if exists */}
        {goal.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteIcon}>📝</Text>
            <Text style={styles.noteText} numberOfLines={2}>
              {goal.note}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    padding: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  targetDate: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // Progress
  progressContainer: {
    marginBottom: SPACING.md,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  currentAmount: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  amountSeparator: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  targetAmount: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  progressPercentText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    marginLeft: SPACING.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remainingLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  remainingAmount: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  allocateButton: {
    ...SHADOWS.sm,
  },
  allocateButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  withdrawButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.text,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },

  // Note
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  noteIcon: {
    fontSize: 14,
    marginRight: SPACING.xs,
  },
  noteText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default GoalAllocationCard;
