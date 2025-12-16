// Add/Edit Transaction Screen - With Form and Chat Tabs

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useChatStore } from '../../stores/chatStore';
import { Category } from '../../types';
import CategoryIcon from '../../components/common/CategoryIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { refreshMyAnalytics } from '../../services/financialAnalyticsService';
import { checkSpendingWarning } from '../../services/goalAllocationService';
import SpendingWarningModal from '../../components/goals/SpendingWarningModal';
import {
  validateTransactionAmount,
  validateTransactionDate,
  validateExpenseAgainstBalance,
  validateLargeTransaction,
  checkDuplicateTransaction,
  validateTransactionNote,
  validateTransactionName,
  showValidationAlert,
  runValidations,
  checkBudgetAlert,
} from '../../utils/validation';
import ChatInterface from '../../components/chat/ChatInterface';

type AddTransactionScreenNavigationProp = StackNavigationProp<
  HomeStackParamList,
  'AddTransaction'
>;
type AddTransactionScreenRouteProp = RouteProp<HomeStackParamList, 'AddTransaction'>;

const AddTransactionScreen: React.FC = () => {
  const navigation = useNavigation<AddTransactionScreenNavigationProp>();
  const route = useRoute<AddTransactionScreenRouteProp>();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();

  const transactionId = route.params?.transactionId;
  const initialType = route.params?.initialType;
  const fromPending = route.params?.fromPending;
  const isEditMode = !!transactionId;

  // Tab state - force 'form' tab when editing from pending transaction
  const [activeTab, setActiveTab] = useState<'form' | 'chat'>('form');

  const [type, setType] = useState<'income' | 'expense'>(fromPending?.type || initialType || 'expense');
  const [amount, setAmount] = useState(fromPending?.amount.toString() || '');
  const [name, setName] = useState(''); // Transaction name/title
  const [selectedCategory, setSelectedCategory] = useState<string | null>(fromPending?.categoryId || null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [note, setNote] = useState(fromPending?.note || '');
  const [date, setDate] = useState(fromPending?.date ? new Date(fromPending.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);

  // Spending warning modal state
  const [showSpendingWarning, setShowSpendingWarning] = useState(false);
  const [spendingWarningData, setSpendingWarningData] = useState({
    netBalanceAfter: 0,
    allocatedBalance: 0,
    deficit: 0,
  });
  const [currency, setCurrency] = useState('VND');

  // Track if editing from chat and store the original transaction for callback
  const [editingFromChat, setEditingFromChat] = useState(false);
  const [chatTransactionRef, setChatTransactionRef] = useState<any>(null);
  const chatInterfaceRef = useRef<any>(null);

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceHover,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xs,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.md,
    },
    tabActive: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    tabText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    cancelButton: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textSecondary,
    },
    headerTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    saveButton: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.primary,
    },
    saveButtonDisabled: {
      color: theme.colors.textTertiary,
    },
    typeToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceHover,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xs,
      marginBottom: theme.spacing.xxl,
      gap: theme.spacing.sm,
    },
    typeButtonContainer: {
      flex: 1,
    },
    typeButton: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.sm,
    },
    typeButtonInactive: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    typeButtonText: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    typeButtonTextActive: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textWhite,
    },
    section: {
      marginBottom: theme.spacing.xxl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
    },
    addCategoryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    addCategoryButtonText: {
      fontSize: theme.fontSize.xs,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.primary,
    },
    amountInput: {
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      fontSize: 32,
      fontWeight: theme.fontWeight.extrabold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    nameInput: {
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    categoryCard: {
      width: '23%',
      aspectRatio: 1,
      margin: '1%',
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryCardSelected: {
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 2,
    },
    categoryIcon: {
      fontSize: 28,
      marginBottom: 4,
    },
    categoryName: {
      fontSize: 11,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    noCategoriesContainer: {
      backgroundColor: theme.colors.surfaceHover,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xxl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    noCategoriesText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    addCategoryLargeButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
    },
    addCategoryLargeButtonText: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.white,
    },
    dateButton: {
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateButtonText: {
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    dateIcon: {
      fontSize: 20,
    },
    noteInput: {
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
      minHeight: 100,
    },
  }));

  // Fetch user categories
  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchTransaction();
    }
  }, []);

  const fetchCategories = async () => {
    if (!user) return;

    setIsFetchingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const fetchTransaction = async () => {
    if (!user || !transactionId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setType(data.type);
        setAmount(data.amount.toString());
        setName(data.name || ''); // Load transaction name
        setSelectedCategory(data.category_id);
        setNote(data.note || '');
        setDate(new Date(data.date));
      }
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      Alert.alert('Error', 'Failed to load transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user currency
  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('currency')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data) setCurrency(data.currency);
      } catch (error: any) {
        console.error('Error fetching currency:', error);
      }
    };
    fetchUserCurrency();
  }, [user]);

  // Refetch categories when type changes
  useEffect(() => {
    fetchCategories();
    setSelectedCategory(null);
  }, [type]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
  };

  // Navigate to Categories screen to add new category
  const handleAddCategory = () => {
    // Navigate to Profile tab -> Categories screen
    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: 'ProfileTab',
        params: {
          screen: 'Categories',
        },
      })
    );
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const validateForm = (): boolean => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return false;
    }

    if (!selectedCategory) {
      Alert.alert('No Category', 'Please select a category');
      return false;
    }

    return true;
  };

  // Check if category belongs to user
  const checkCategoryOwnership = async (categoryId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        Alert.alert('Invalid Category', 'The selected category does not exist or does not belong to you.');
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // Check if transaction affects budgets and show alerts
  const checkBudgetImpact = async (categoryId: string, transactionAmount: number) => {
    if (!user || type !== 'expense') return;

    try {
      // Get active budgets for this category
      const { data: budgets, error } = await supabase
        .from('budgets')
        .select('*, categories(name, icon)')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (error || !budgets || budgets.length === 0) return;

      // Check each budget
      for (const budget of budgets) {
        // Get current spending in this budget period
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .eq('type', 'expense')
          .gte('date', budget.start_date)
          .lte('date', budget.end_date);

        const currentSpent = transactions
          ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const newSpent = currentSpent + transactionAmount;

        // Check if this triggers a budget alert
        const alert = checkBudgetAlert(
          newSpent,
          budget.amount,
          budget.alert_threshold
        );

        if (alert?.shouldAlert) {
          Alert.alert(
            alert.message.split('\n')[0], // Title
            alert.message.split('\n').slice(1).join('\n') // Message
          );
        }
      }
    } catch (error) {
      console.error('Error checking budget impact:', error);
    }
  };

  const handleSave = async () => {
    if (!validateForm() || !user || !selectedCategory) return;

    const amountNum = Number(amount);

    // Run comprehensive validations
    setIsLoading(true);

    try {
      // Basic validations (blocking)
      const amountValidation = validateTransactionAmount(amountNum);
      if (!amountValidation.isValid) {
        Alert.alert(amountValidation.title!, amountValidation.message);
        setIsLoading(false);
        return;
      }

      const dateValidation = validateTransactionDate(date);
      if (!dateValidation.isValid) {
        Alert.alert(dateValidation.title!, dateValidation.message);
        setIsLoading(false);
        return;
      }

      const nameValidation = validateTransactionName(name);
      if (!nameValidation.isValid) {
        Alert.alert(nameValidation.title!, nameValidation.message);
        setIsLoading(false);
        return;
      }

      const noteValidation = validateTransactionNote(note);
      if (!noteValidation.isValid) {
        Alert.alert(noteValidation.title!, noteValidation.message);
        setIsLoading(false);
        return;
      }

      // Check category ownership
      const isValidCategory = await checkCategoryOwnership(selectedCategory);
      if (!isValidCategory) {
        setIsLoading(false);
        return;
      }

      // Warning validations (non-blocking - ask user)
      if (type === 'expense') {
        // Get original amount if editing
        let originalAmount: number | undefined;
        if (isEditMode && transactionId) {
          const { data } = await supabase
            .from('transactions')
            .select('amount')
            .eq('id', transactionId)
            .single();
          originalAmount = data ? Number(data.amount) : undefined;
        }

        const balanceValidation = await validateExpenseAgainstBalance(
          user.id,
          amountNum,
          isEditMode,
          originalAmount
        );

        if (!balanceValidation.isValid) {
          setIsLoading(false);
          showValidationAlert(
            balanceValidation,
            () => proceedWithSave(), // Continue
            () => setIsLoading(false) // Cancel
          );
          return;
        }

        // Check if expense would reduce net balance below allocated balance (NEW SYSTEM)
        const warning = await checkSpendingWarning(user.id, amountNum, isEditMode, originalAmount);
        if (warning.shouldWarn) {
          setSpendingWarningData({
            netBalanceAfter: warning.netBalanceAfter,
            allocatedBalance: warning.allocatedBalance,
            deficit: warning.deficit,
          });
          setShowSpendingWarning(true);
          setIsLoading(false);
          return; // Stop here, let user decide via modal
        }
      }

      // Check for large transactions
      const largeValidation = validateLargeTransaction(amountNum, type);
      if (!largeValidation.isValid) {
        setIsLoading(false);
        showValidationAlert(
          largeValidation,
          () => proceedWithSave(),
          () => setIsLoading(false)
        );
        return;
      }

      // Check for duplicates
      if (!isEditMode) {
        const duplicateValidation = await checkDuplicateTransaction(
          user.id,
          amountNum,
          selectedCategory,
          date,
          type
        );

        if (!duplicateValidation.isValid) {
          setIsLoading(false);
          showValidationAlert(
            duplicateValidation,
            () => proceedWithSave(),
            () => setIsLoading(false)
          );
          return;
        }
      }

      // All validations passed
      await proceedWithSave();
    } catch (error: any) {
      console.error('Error during validation:', error);
      Alert.alert('Error', 'An error occurred during validation');
      setIsLoading(false);
    }
  };

  const proceedWithSave = async () => {
    if (!user || !selectedCategory) return;

    try {
      const transactionData = {
        user_id: user.id,
        type,
        amount: Number(amount),
        name: name.trim() || null,
        category_id: selectedCategory,
        note: note.trim() || null,
        date: date.toISOString(),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', transactionId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Check budget impact after successful save
        if (type === 'expense') {
          await checkBudgetImpact(selectedCategory, Number(amount));
        }

        Alert.alert('Success', 'Transaction updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData]);

        if (error) throw error;

        // Refresh analytics after adding transaction (fallback if trigger doesn't work)
        console.log('📊 Refreshing analytics after transaction insert...');
        refreshMyAnalytics().then(result => {
          if (result.success) {
            console.log('✓ Analytics refreshed:', result.message);
          } else {
            console.warn('⚠️ Failed to refresh analytics:', result.message);
          }
        }).catch(err => {
          console.error('❌ Error refreshing analytics:', err);
        });

        // Check budget impact after successful save
        if (type === 'expense') {
          await checkBudgetImpact(selectedCategory, Number(amount));
        }

        // If this transaction came from a pending transaction, delete it from pending_transactions
        if (fromPending) {
          console.log('🗑️ Deleting pending transaction:', fromPending.pendingId);
          const { error: deleteError } = await supabase
            .from('pending_transactions')
            .delete()
            .eq('id', fromPending.pendingId);

          if (deleteError) {
            console.error('Error deleting pending transaction:', deleteError);
            // Don't fail the whole operation if deletion fails
          } else {
            console.log('✅ Pending transaction deleted successfully');
          }
        }

        // If transaction was edited from chat, notify ChatInterface and switch back
        if (editingFromChat && chatTransactionRef && chatInterfaceRef.current) {
          chatInterfaceRef.current.markTransactionAsSaved(chatTransactionRef);
          setEditingFromChat(false);
          setChatTransactionRef(null);
          setActiveTab('chat');
          Alert.alert('Success', 'Transaction saved successfully!');
        } else {
          Alert.alert('Success', 'Transaction added successfully', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', error.message || 'Failed to save transaction');
      setIsLoading(false);
    }
  };

  // Handle transaction saved from chat
  const handleTransactionSaved = () => {
    // User stays in chat conversation after saving transaction
    // No navigation - they can continue chatting or add more transactions
  };

  // Handle edit transaction from chat - switch to form tab and pre-fill
  const handleEditFromChat = (transaction: any) => {
    // Pre-fill form fields with transaction data
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setSelectedCategory(transaction.category_id || null);
    setNote(transaction.note || '');
    setDate(transaction.date ? new Date(transaction.date) : new Date());

    // Store reference that this is from chat for callback after save
    setEditingFromChat(true);
    setChatTransactionRef(transaction);

    // Switch to form tab
    setActiveTab('form');
  };

  // Handle create category from chat - navigate to category form
  const handleCreateCategory = (suggestedName: string, type: 'income' | 'expense') => {
    // Navigate to ProfileTab -> Categories -> CategoryForm with suggested name
    navigation.navigate('ProfileTab', {
      screen: 'CategoryForm',
      params: {
        suggestedName: suggestedName,
        type: type,
      },
    } as any);
  };

  // Spending Warning Modal Handlers
  const handleGoToGoals = () => {
    setShowSpendingWarning(false);
    navigation.navigate('Budget', {
      screen: 'SavingsTab'
    } as any);
  };

  const handleContinueAnyway = async () => {
    setShowSpendingWarning(false);
    await proceedWithSave();
  };

  const handleCancelTransaction = () => {
    setShowSpendingWarning(false);
    setIsLoading(false);
  };

  // Note: Chat history is now persisted across navigation
  // The conversation will remain even when navigating away and coming back

  // Don't show chat tab in edit mode
  const showChatTab = !isEditMode;

  if (isLoading && isEditMode) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
        </Text>
        {activeTab === 'form' ? (
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Tabs */}
      {showChatTab && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'form' && styles.tabActive]}
            onPress={() => setActiveTab('form')}
          >
            <Text style={[styles.tabText, activeTab === 'form' && styles.tabTextActive]}>
              📝 Form
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              💬 Chat
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content - Form or Chat */}
      {activeTab === 'form' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

        {/* Type Toggle with Gradients */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={styles.typeButtonContainer}
            onPress={() => handleTypeChange('income')}
            activeOpacity={0.8}
          >
            {type === 'income' ? (
              <LinearGradient
                colors={[theme.colors.success, theme.colors.successDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.typeButton}
              >
                <Text style={styles.typeButtonTextActive}>💰 Income</Text>
              </LinearGradient>
            ) : (
              <View style={styles.typeButtonInactive}>
                <Text style={styles.typeButtonText}>💰 Income</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeButtonContainer}
            onPress={() => handleTypeChange('expense')}
            activeOpacity={0.8}
          >
            {type === 'expense' ? (
              <LinearGradient
                colors={[theme.colors.danger, theme.colors.dangerDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.typeButton}
              >
                <Text style={styles.typeButtonTextActive}>💸 Expense</Text>
              </LinearGradient>
            ) : (
              <View style={styles.typeButtonInactive}>
                <Text style={styles.typeButtonText}>💸 Expense</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={theme.colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        {/* Transaction Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transaction Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Grocery Shopping, Monthly Salary"
            placeholderTextColor={theme.colors.textTertiary}
            value={name}
            onChangeText={setName}
            editable={!isLoading}
            autoCapitalize="words"
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Category</Text>
            <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryButton}>
              <Text style={styles.addCategoryButtonText}>+ Add Category</Text>
            </TouchableOpacity>
          </View>
          {isFetchingCategories ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 12 }} />
          ) : categories.length === 0 ? (
            <View style={styles.noCategoriesContainer}>
              <Text style={styles.noCategoriesText}>
                No {type} categories available yet
              </Text>
              <TouchableOpacity style={styles.addCategoryLargeButton} onPress={handleAddCategory}>
                <Text style={styles.addCategoryLargeButtonText}>+ Create Your First Category</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.id && styles.categoryCardSelected,
                    { borderColor: category.color },
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <CategoryIcon icon={category.icon} iconUrl={category.icon_url} size={40} />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {date.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.dateIcon}>📅</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Note Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note..."
            placeholderTextColor={theme.colors.textTertiary}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            editable={!isLoading}
            textAlignVertical="top"
          />
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ChatInterface
            ref={chatInterfaceRef}
            onTransactionSaved={handleTransactionSaved}
            onEditTransaction={handleEditFromChat}
            onCreateCategory={handleCreateCategory}
          />
        </KeyboardAvoidingView>
      )}

      {/* Spending Warning Modal */}
      <SpendingWarningModal
        visible={showSpendingWarning}
        netBalanceAfter={spendingWarningData.netBalanceAfter}
        allocatedBalance={spendingWarningData.allocatedBalance}
        deficit={spendingWarningData.deficit}
        currency={currency}
        onClose={handleCancelTransaction}
        onGoToGoals={handleGoToGoals}
        onContinueAnyway={handleContinueAnyway}
      />
    </SafeAreaView>
  );
};

export default AddTransactionScreen;
