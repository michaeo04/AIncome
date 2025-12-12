// Pending Transactions Screen - Review and confirm detected transactions
// ========================================================================
// Displays bank transactions that have been auto-detected via webhook
// Users can review, edit, confirm (save to database), or reject each transaction

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { usePendingTransactionsStore } from '../../stores/pendingTransactionsStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { supabase } from '../../services/supabase';
import { PendingTransaction } from '../../types';

const PendingTransactionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { pendingTransactions, isLoading, fetchPending, confirmPending, rejectPending, updatePending } =
    usePendingTransactionsStore();

  const [currency, setCurrency] = useState('VND');

  const styles = useThemedStyles((theme) =>
    StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
      },
      loadingText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
      },
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.huge,
        backgroundColor: theme.colors.background,
      },
      emptyIcon: {
        fontSize: 72,
        marginBottom: theme.spacing.lg,
      },
      emptyTitle: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.sm,
      },
      emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
      },
      scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 100,
      },
      header: {
        marginBottom: theme.spacing.xl,
      },
      headerTitle: {
        fontSize: theme.fontSize.xxxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.xs,
      },
      headerSubtitle: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
      },
      pendingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
      },
      cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.md,
      },
      bankBadge: {
        backgroundColor: theme.colors.primary + '20',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
      },
      bankBadgeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.primary,
      },
      confidenceBadge: {
        backgroundColor: theme.colors.success + '20',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        marginLeft: theme.spacing.sm,
      },
      confidenceBadgeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.success,
      },
      smsText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.lg,
        fontFamily: 'monospace',
      },
      transactionInfo: {
        marginBottom: theme.spacing.lg,
      },
      infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      },
      infoIcon: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.round,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
      },
      infoIconText: {
        fontSize: theme.fontSize.xl,
      },
      infoContent: {
        flex: 1,
      },
      infoLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textTertiary,
        marginBottom: theme.spacing.xs,
      },
      infoValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textPrimary,
      },
      amountValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
      },
      incomeAmount: {
        color: theme.colors.success,
      },
      expenseAmount: {
        color: theme.colors.danger,
      },
      merchantText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
      },
      actionButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
      },
      confirmButton: {
        flex: 1,
        backgroundColor: theme.colors.success,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        ...theme.shadows.sm,
      },
      confirmButtonText: {
        color: theme.colors.textWhite,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
      },
      rejectButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.danger,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
      },
      rejectButtonText: {
        color: theme.colors.danger,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
      },
      timestampText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textTertiary,
        marginTop: theme.spacing.md,
        textAlign: 'center',
      },
      // Edit mode styles
      editButton: {
        backgroundColor: theme.colors.secondary + '20',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
      },
      editButtonText: {
        color: theme.colors.secondary,
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
      },
      editInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.xs,
      },
      editInputFocused: {
        borderColor: theme.colors.primary,
      },
      editActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.md,
      },
      saveButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
      },
      saveButtonText: {
        color: theme.colors.textWhite,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
      },
      cancelButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
      },
      cancelButtonText: {
        color: theme.colors.textPrimary,
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
      },
      // Category grid styles (matching AddTransactionScreen)
      categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
        marginTop: theme.spacing.xs,
      },
      categoryCard: {
        width: '23%',
        aspectRatio: 1,
        margin: 4,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xs,
      },
      categoryCardSelected: {
        backgroundColor: theme.colors.primary + '10',
        borderWidth: 3,
      },
      categoryIcon: {
        fontSize: 28,
        marginBottom: theme.spacing.xs,
      },
      categoryName: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        fontWeight: theme.fontWeight.medium,
      },
      // Date button styles (matching AddTransactionScreen)
      dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.xs,
      },
      dateButtonText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textPrimary,
        fontWeight: theme.fontWeight.medium,
      },
      dateIcon: {
        fontSize: 20,
      },
    })
  );

  // Fetch user profile (currency)
  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setCurrency(data.currency);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchPending(user.id);
        fetchUserProfile();
      }
    }, [user])
  );

  // Handle confirm transaction
  const handleConfirm = async (id: string) => {
    try {
      await confirmPending(id);
      Alert.alert('Success', 'Transaction added to your records', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh pending list
            if (user) fetchPending(user.id);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error confirming transaction:', error);
      Alert.alert('Error', 'Failed to confirm transaction. Please try again.');
    }
  };

  // Handle reject transaction
  const handleReject = async (id: string) => {
    Alert.alert(
      'Reject Transaction',
      'Are you sure you want to reject this transaction? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectPending(id);
              // Refresh pending list
              if (user) fetchPending(user.id);
            } catch (error: any) {
              console.error('Error rejecting transaction:', error);
              Alert.alert('Error', 'Failed to reject transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Navigate to AddTransactionScreen with pending transaction data
  const handleEdit = (pending: PendingTransaction) => {
    navigation.navigate('AddTransaction', {
      fromPending: {
        pendingId: pending.id,
        type: pending.parsed_type,
        amount: pending.parsed_amount,
        categoryId: pending.parsed_category_id,
        note: pending.parsed_note,
        date: pending.parsed_date,
      },
    });
  };

  // Render loading state
  if (isLoading && pendingTransactions.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading pending transactions...</Text>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (pendingTransactions.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>No Pending Transactions</Text>
        <Text style={styles.emptyText}>
          When you receive bank notifications, they'll appear here for review.
          {'\n\n'}
          Use the bank simulator to test this feature!
        </Text>
      </SafeAreaView>
    );
  }

  // Render pending transactions list
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Pending Transactions</Text>
          <Text style={styles.headerSubtitle}>
            {pendingTransactions.length} transaction{pendingTransactions.length > 1 ? 's' : ''} to review
          </Text>
        </View>

        {pendingTransactions.map((pending) => {
          const category = getCategoryById(pending.parsed_category_id);

          return (
            <View key={pending.id} style={styles.pendingCard}>
              {/* Card Header - Bank Name & Confidence */}
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {pending.bank_name && (
                    <View style={styles.bankBadge}>
                      <Text style={styles.bankBadgeText}>{pending.bank_name}</Text>
                    </View>
                  )}
                  {pending.confidence && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceBadgeText}>
                        {Math.round(pending.confidence * 100)}% confident
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Original SMS Text */}
              <Text style={styles.smsText}>{pending.raw_sms_text}</Text>

              {/* Edit Button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(pending)}
              >
                <Text style={styles.editButtonText}>✏️ Edit Transaction</Text>
              </TouchableOpacity>

              {/* Parsed Transaction Info */}
              <View style={styles.transactionInfo}>
                {/* Amount */}
                <View style={styles.infoRow}>
                  <View
                    style={[
                      styles.infoIcon,
                      {
                        backgroundColor:
                          pending.parsed_type === 'income'
                            ? theme.colors.success + '20'
                            : theme.colors.danger + '20',
                      },
                    ]}
                  >
                    <Text style={styles.infoIconText}>
                      {pending.parsed_type === 'income' ? '💰' : '💸'}
                    </Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Amount</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        styles.amountValue,
                        pending.parsed_type === 'income' ? styles.incomeAmount : styles.expenseAmount,
                      ]}
                    >
                      {pending.parsed_type === 'income' ? '+' : '-'}
                      {formatCurrency(pending.parsed_amount, currency)}
                    </Text>
                  </View>
                </View>

                {/* Category */}
                <View style={styles.infoRow}>
                  <View
                    style={[
                      styles.infoIcon,
                      { backgroundColor: (category?.color || theme.colors.primary) + '20' },
                    ]}
                  >
                    <Text style={styles.infoIconText}>{category?.icon || '📂'}</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>{category?.name || 'Uncategorized'}</Text>
                    {pending.parsed_merchant && (
                      <Text style={styles.merchantText}>at {pending.parsed_merchant}</Text>
                    )}
                  </View>
                </View>

                {/* Date */}
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, { backgroundColor: theme.colors.secondary + '20' }]}>
                    <Text style={styles.infoIconText}>📅</Text>
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{formatDate(pending.parsed_date)}</Text>
                  </View>
                </View>

                {/* Note */}
                {pending.parsed_note && (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                      <Text style={styles.infoIconText}>📝</Text>
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Note</Text>
                      <Text style={styles.infoValue}>{pending.parsed_note}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => handleConfirm(pending.id)}
                >
                  <Text style={styles.confirmButtonText}>✓ Confirm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(pending.id)}
                >
                  <Text style={styles.rejectButtonText}>✕ Reject</Text>
                </TouchableOpacity>
              </View>

              {/* Timestamp */}
              <Text style={styles.timestampText}>
                Detected {new Date(pending.created_at).toLocaleString()}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PendingTransactionsScreen;
