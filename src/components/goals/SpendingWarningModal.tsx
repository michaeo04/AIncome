// SpendingWarningModal - Warning when spending would reduce net balance below allocations

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

interface SpendingWarningModalProps {
  visible: boolean;
  netBalanceAfter: number;
  allocatedBalance: number;
  deficit: number;
  currency: string;
  onClose: () => void;
  onGoToGoals: () => void;
  onContinueAnyway: () => void;
}

const SpendingWarningModal: React.FC<SpendingWarningModalProps> = ({
  visible,
  netBalanceAfter,
  allocatedBalance,
  deficit,
  currency,
  onClose,
  onGoToGoals,
  onContinueAnyway,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#FFF5F5']}
            style={styles.modalContent}
          >
            {/* Warning Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[COLORS.warning, COLORS.warningDark]}
                style={styles.iconGradient}
              >
                <Text style={styles.icon}>⚠️</Text>
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Low Available Balance Warning</Text>
            <Text style={styles.description}>
              This expense will reduce your net balance below the total amount allocated to your savings goals.
            </Text>

            {/* Balance Breakdown */}
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Net Balance After Expense:</Text>
                <Text style={[styles.breakdownValue, { color: COLORS.danger }]}>
                  {formatCurrency(netBalanceAfter, currency)}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Allocated to Goals:</Text>
                <Text style={[styles.breakdownValue, { color: COLORS.primary }]}>
                  {formatCurrency(allocatedBalance, currency)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { fontWeight: FONT_WEIGHT.bold }]}>
                  Deficit:
                </Text>
                <Text style={[styles.breakdownValue, styles.deficitValue]}>
                  -{formatCurrency(deficit, currency)}
                </Text>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                You may want to withdraw money from your savings goals before recording this expense to maintain a positive available balance.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Go to Goals Button */}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onGoToGoals}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.primaryButtonText}>Manage Goals</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Continue Anyway Button */}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onContinueAnyway}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Continue Anyway</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  modalContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },

  // Icon
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
  },

  // Title & Description
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },

  // Breakdown
  breakdownContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  breakdownLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    flex: 1,
  },
  breakdownValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    marginLeft: SPACING.sm,
  },
  deficitValue: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.lg,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Actions
  actionsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  button: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryButton: {
    ...SHADOWS.md,
  },
  primaryButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  secondaryButton: {
    backgroundColor: COLORS.warningLight,
    borderWidth: 2,
    borderColor: COLORS.warning,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.warning,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
});

export default SpendingWarningModal;
