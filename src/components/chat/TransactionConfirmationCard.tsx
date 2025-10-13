// Transaction Confirmation Card - Shows parsed transaction for user confirmation

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ParsedTransaction } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

interface TransactionConfirmationCardProps {
  transaction: ParsedTransaction;
  currency: string;
  onEdit: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const TransactionConfirmationCard: React.FC<TransactionConfirmationCardProps> = ({
  transaction,
  currency,
  onEdit,
  onCancel,
  onConfirm,
  isLoading = false
}) => {
  // Render confidence stars
  const renderConfidenceStars = () => {
    const stars = Math.round(transaction.confidence * 5);
    const fullStars = '⭐'.repeat(stars);
    const emptyStars = '☆'.repeat(5 - stars);
    return fullStars + emptyStars;
  };

  // Get confidence color
  const getConfidenceColor = () => {
    if (transaction.confidence >= 0.8) return COLORS.success;
    if (transaction.confidence >= 0.6) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✅</Text>
        <Text style={styles.headerText}>Mình hiểu rồi:</Text>
      </View>

      {/* Transaction Details */}
      <View style={styles.details}>
        {/* Type */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>Loại:</Text>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>
              {transaction.type === 'income' ? '💰' : '💸'}
            </Text>
            <Text style={[styles.value, styles.typeText]}>
              {transaction.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>Số tiền:</Text>
          <Text style={[
            styles.value,
            styles.amount,
            { color: transaction.type === 'income' ? COLORS.success : COLORS.danger }
          ]}>
            {formatCurrency(transaction.amount, currency)}
          </Text>
        </View>

        {/* Category */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>Hạng mục:</Text>
          <Text style={styles.value}>
            {transaction.category_name || 'Khác'}
          </Text>
        </View>

        {/* Note */}
        {transaction.note && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Ghi chú:</Text>
            <Text style={[styles.value, styles.note]}>
              {transaction.note}
            </Text>
          </View>
        )}

        {/* Date */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ngày:</Text>
          <Text style={styles.value}>
            {new Date(transaction.date).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>

      {/* Confidence Indicator */}
      <View style={styles.confidenceContainer}>
        <Text style={styles.confidenceLabel}>Độ tin cậy:</Text>
        <Text style={styles.confidenceStars}>{renderConfidenceStars()}</Text>
        <Text style={[styles.confidencePercent, { color: getConfidenceColor() }]}>
          {Math.round(transaction.confidence * 100)}%
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onEdit}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>✏️ Sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>❌ Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onConfirm}
          disabled={isLoading}
          activeOpacity={0.8}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={[COLORS.success, COLORS.successDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.confirmButton, isLoading && styles.buttonDisabled]}
          >
            <Text style={styles.confirmButtonText}>
              {isLoading ? 'Đang lưu...' : '✅ Lưu'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerIcon: {
    fontSize: FONT_SIZE.xl,
    marginRight: SPACING.xs,
  },
  headerText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  details: {
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2,
  },
  typeIcon: {
    fontSize: FONT_SIZE.lg,
    marginRight: SPACING.xs,
  },
  typeText: {
    textAlign: 'right',
  },
  amount: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  note: {
    fontSize: FONT_SIZE.sm,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: BORDER_RADIUS.md,
  },
  confidenceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  confidenceStars: {
    fontSize: FONT_SIZE.md,
    marginRight: SPACING.sm,
  },
  confidencePercent: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
  },
  confirmButton: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textWhite,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default TransactionConfirmationCard;
