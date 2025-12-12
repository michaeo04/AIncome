// AllocationModal - Bottom sheet for allocating/withdrawing money to/from goals

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';
import { GoalProgressView, AvailableBalance } from '../../types';

interface AllocationModalProps {
  visible: boolean;
  goal: GoalProgressView | null;
  balance: AvailableBalance;
  currency: string;
  type: 'allocate' | 'withdraw';
  onClose: () => void;
  onConfirm: (amount: number, note: string) => Promise<void>;
}

const AllocationModal: React.FC<AllocationModalProps> = ({
  visible,
  goal,
  balance,
  currency,
  type,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount('');
      setNote('');
      setError('');
    }
  }, [visible]);

  if (!goal) return null;

  const isAllocating = type === 'allocate';
  const maxAmount = isAllocating ? balance.available_balance : goal.allocated_amount;
  const amountNumber = parseFloat(amount.replace(/,/g, '')) || 0;

  // Quick amount buttons
  const quickAmounts = isAllocating
    ? [1000000, 2000000, 5000000, Math.floor(maxAmount)]
    : [Math.floor(goal.allocated_amount * 0.25), Math.floor(goal.allocated_amount * 0.5), Math.floor(goal.allocated_amount * 0.75), goal.allocated_amount];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError('');
  };

  const handleAmountChange = (text: string) => {
    // Remove non-numeric characters except comma
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
    setError('');
  };

  const validateAmount = (): boolean => {
    if (amountNumber <= 0) {
      setError('Amount must be greater than 0');
      return false;
    }

    if (amountNumber > maxAmount) {
      if (isAllocating) {
        setError(`Insufficient available balance. Max: ${formatCurrency(maxAmount, currency)}`);
      } else {
        setError(`Insufficient allocated amount. Max: ${formatCurrency(maxAmount, currency)}`);
      }
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (!validateAmount()) return;

    setIsProcessing(true);
    setError('');

    try {
      await onConfirm(amountNumber, note);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.modalContent}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.dragIndicator} />
                <View style={styles.headerContent}>
                  <View style={[styles.iconContainer, { backgroundColor: goal.color + '20' }]}>
                    <Text style={styles.icon}>{goal.icon}</Text>
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>
                      {isAllocating ? 'Allocate to Goal' : 'Withdraw from Goal'}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {goal.name}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Balance Info */}
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    {isAllocating ? 'Available Balance:' : 'Allocated in Goal:'}
                  </Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(maxAmount, currency)}
                  </Text>
                </View>
                {isAllocating && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Goal Progress:</Text>
                    <Text style={styles.infoValue}>
                      {formatCurrency(goal.allocated_amount, currency)} / {formatCurrency(goal.target_amount, currency)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₫</Text>
                  <TextInput
                    style={styles.input}
                    value={amount ? formatCurrency(amountNumber, '').replace('₫', '').trim() : ''}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={COLORS.textTertiary}
                  />
                </View>
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountsContainer}>
                <Text style={styles.quickAmountsLabel}>Quick amounts:</Text>
                <View style={styles.quickAmountsButtons}>
                  {quickAmounts.filter(amt => amt > 0).map((amt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickButton}
                      onPress={() => handleQuickAmount(amt)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickButtonText}>
                        {index === quickAmounts.length - 1 ? 'All' : formatCurrency(amt, currency)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g., Monthly savings"
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  maxLength={200}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.confirmButton]}
                  onPress={handleConfirm}
                  disabled={isProcessing || amountNumber <= 0}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.confirmButtonGradient}
                    >
                      <Text style={styles.confirmButtonText}>
                        {isAllocating ? 'Transfer' : 'Withdraw'} {amountNumber > 0 ? formatCurrency(amountNumber, currency) : ''}
                      </Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  modalContent: {
    padding: SPACING.lg,
  },

  // Header
  header: {
    marginBottom: SPACING.lg,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  icon: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },

  // Info
  infoContainer: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  infoValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  // Input
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  noteInput: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    marginTop: SPACING.xs,
  },

  // Quick Amounts
  quickAmountsContainer: {
    marginBottom: SPACING.lg,
  },
  quickAmountsLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  quickAmountsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  quickButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.primary,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  confirmButton: {
    ...SHADOWS.md,
  },
  confirmButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
});

export default AllocationModal;
