// Transaction Detail Screen - View, Edit, Delete

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';

type TransactionDetailScreenNavigationProp = StackNavigationProp<
  HomeStackParamList,
  'TransactionDetail'
>;
type TransactionDetailScreenRouteProp = RouteProp<
  HomeStackParamList,
  'TransactionDetail'
>;

const TransactionDetailScreen: React.FC = () => {
  const navigation = useNavigation<TransactionDetailScreenNavigationProp>();
  const route = useRoute<TransactionDetailScreenRouteProp>();
  const { user } = useAuthStore();

  const { transactionId } = route.params;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currency, setCurrency] = useState('VND');

  useEffect(() => {
    fetchTransaction();
    fetchUserCurrency();
  }, []);

  const fetchUserCurrency = async () => {
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
      console.error('Error fetching currency:', error);
    }
  };

  const fetchTransaction = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          note,
          date,
          category_id,
          created_at,
          updated_at,
          category:categories (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setTransaction(data as any);
      }
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      Alert.alert('Error', 'Failed to load transaction');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('AddTransaction', { transactionId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!user) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Transaction deleted successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Error', 'Failed to delete transaction');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Transaction not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction Detail</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Amount Card with Gradient */}
        <LinearGradient
          colors={
            transaction.type === 'income'
              ? [COLORS.success, COLORS.successDark]
              : [COLORS.danger, COLORS.dangerDark]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.amountCard}
        >
          <View style={styles.amountHeader}>
            <Text style={styles.amountLabel}>
              {transaction.type === 'income' ? '💰 Income' : '💸 Expense'}
            </Text>
            <View style={styles.amountBadge}>
              <Text style={styles.amountBadgeText}>
                {transaction.type === 'income' ? '📈' : '📉'}
              </Text>
            </View>
          </View>
          <Text style={styles.amountValue}>
            {transaction.type === 'income' ? '+' : '-'}
            {formatCurrency(Number(transaction.amount), currency)}
          </Text>
        </LinearGradient>

        {/* Details Section */}
        <View style={styles.detailsSection}>
          {/* Category */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <View style={styles.categoryInfo}>
              <View
                style={[
                  styles.categoryIconContainer,
                  { backgroundColor: transaction.category?.color + '20' },
                ]}
              >
                <Text style={styles.categoryIconText}>
                  {transaction.category?.icon || '💰'}
                </Text>
              </View>
              <Text style={styles.detailValue}>
                {transaction.category?.name || 'Uncategorized'}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.date)}</Text>
          </View>

          {/* Note */}
          {transaction.note && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Note</Text>
              <Text style={styles.detailValueMultiline}>{transaction.note}</Text>
            </View>
          )}

          {/* Created */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValueSmall}>
              {formatDate(transaction.created_at)}
            </Text>
          </View>

          {/* Last Updated */}
          {transaction.updated_at !== transaction.created_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValueSmall}>
                {formatDate(transaction.updated_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Actions with Gradients */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            onPress={handleEdit}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>✏️ Edit Transaction</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDeleting ? [COLORS.dangerLight, COLORS.dangerLight] : [COLORS.danger, COLORS.dangerDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.deleteButton}
            >
              {isDeleting ? (
                <ActivityIndicator color={COLORS.textWhite} />
              ) : (
                <Text style={styles.deleteButtonText}>🗑️ Delete Transaction</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.danger,
    marginBottom: SPACING.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.sm,
  },
  errorButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingTop: SPACING.sm,
  },
  backButton: {
    fontSize: FONT_SIZE.md,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.medium,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  amountCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxxl,
    marginBottom: SPACING.xxl,
    ...SHADOWS.lg,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  amountLabel: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textWhite,
    fontWeight: FONT_WEIGHT.semibold,
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountBadgeText: {
    fontSize: FONT_SIZE.lg,
  },
  amountValue: {
    fontSize: FONT_SIZE.massive,
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.textWhite,
  },
  detailsSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceHover,
  },
  detailLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: FONT_WEIGHT.medium,
  },
  detailValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  detailValueMultiline: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  detailValueSmall: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 2,
    textAlign: 'right',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  categoryIconText: {
    fontSize: FONT_SIZE.lg,
  },
  actionsSection: {
    marginTop: SPACING.sm,
  },
  editButton: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  editButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  deleteButton: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  deleteButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
});

export default TransactionDetailScreen;
