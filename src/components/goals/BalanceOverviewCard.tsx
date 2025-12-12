// BalanceOverviewCard - Shows breakdown of net balance, allocated, and available balance

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';
import { AvailableBalance } from '../../types';

interface BalanceOverviewCardProps {
  balance: AvailableBalance;
  currency: string;
  isLoading?: boolean;
}

const BalanceOverviewCard: React.FC<BalanceOverviewCardProps> = ({
  balance,
  currency,
  isLoading = false,
}) => {
  const getAvailableBalanceColor = () => {
    if (balance.available_balance < 0) return COLORS.danger;
    if (balance.available_balance < balance.net_balance * 0.2) return COLORS.warning;
    return COLORS.success;
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Loading balance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#FFFFFF', '#F9FAFB']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💰</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Your Balance</Text>
            <Text style={styles.subtitle}>Money allocation overview</Text>
          </View>
        </View>

        {/* Balance Breakdown */}
        <View style={styles.balanceContainer}>
          {/* Net Balance */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={[styles.indicator, { backgroundColor: COLORS.primary }]} />
              <View>
                <Text style={styles.balanceLabel}>Net Balance</Text>
                <Text style={styles.balanceDescription}>Total money you have</Text>
              </View>
            </View>
            <Text style={[styles.balanceAmount, { color: COLORS.primary }]}>
              {formatCurrency(balance.net_balance, currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Allocated Balance */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={[styles.indicator, { backgroundColor: COLORS.secondary }]} />
              <View>
                <Text style={styles.balanceLabel}>Allocated to Goals</Text>
                <Text style={styles.balanceDescription}>Money locked in savings</Text>
              </View>
            </View>
            <Text style={[styles.balanceAmount, { color: COLORS.secondary }]}>
              {formatCurrency(balance.allocated_balance, currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Available Balance */}
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={[styles.indicator, { backgroundColor: getAvailableBalanceColor() }]} />
              <View>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceDescription}>Free to allocate or spend</Text>
              </View>
            </View>
            <Text style={[styles.balanceAmount, { color: getAvailableBalanceColor() }]}>
              {formatCurrency(balance.available_balance, currency)}
            </Text>
          </View>
        </View>

        {/* Warning if negative available balance */}
        {balance.available_balance < 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Over-allocated</Text>
              <Text style={styles.warningText}>
                Your spending has reduced net balance below allocated amount.
                Consider withdrawing from goals.
              </Text>
            </View>
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Available Balance</Text> = Net Balance - Allocated to Goals
          </Text>
        </View>
      </LinearGradient>
    </View>
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
  loadingText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    padding: SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryLight,
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
  subtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },

  // Balance Container
  balanceContainer: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.text,
    marginBottom: 2,
  },
  balanceDescription: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },

  // Warning
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.dangerLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.danger,
    marginBottom: 2,
  },
  warningText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.danger,
    lineHeight: 16,
  },

  // Info
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    flex: 1,
    lineHeight: 16,
  },
  infoBold: {
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default BalanceOverviewCard;
