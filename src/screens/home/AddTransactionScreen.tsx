// Add/Edit Transaction Screen - With Form and Chat Tabs

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { Category } from '../../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SHADOWS } from '../../theme/modernTheme';
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
  const { clearChat } = useChatStore();

  const transactionId = route.params?.transactionId;
  const isEditMode = !!transactionId;

  // Tab state
  const [activeTab, setActiveTab] = useState<'form' | 'chat'>('form');

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [name, setName] = useState(''); // Transaction name/title
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(true);

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

        // Check budget impact after successful save
        if (type === 'expense') {
          await checkBudgetImpact(selectedCategory, Number(amount));
        }

        Alert.alert('Success', 'Transaction added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', error.message || 'Failed to save transaction');
      setIsLoading(false);
    }
  };

  // Handle transaction saved from chat
  const handleTransactionSaved = () => {
    navigation.goBack();
  };

  // Clear chat when leaving screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        clearChat();
      };
    }, [])
  );

  // Don't show chat tab in edit mode
  const showChatTab = !isEditMode;

  if (isLoading && isEditMode) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
                colors={[COLORS.success, COLORS.successDark]}
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
                colors={[COLORS.danger, COLORS.dangerDark]}
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
            placeholderTextColor="#9CA3AF"
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
            placeholderTextColor="#9CA3AF"
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
            <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 12 }} />
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
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
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
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            editable={!isLoading}
            textAlignVertical="top"
          />
        </View>
        </ScrollView>
      ) : (
        <ChatInterface onTransactionSaved={handleTransactionSaved} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceHover,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  tabText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  saveButtonDisabled: {
    color: '#9CA3AF',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceHover,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  typeButtonContainer: {
    flex: 1,
  },
  typeButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  typeButtonInactive: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  typeButtonText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textWhite,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  addCategoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  addCategoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  amountInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  noCategoriesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  addCategoryLargeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCategoryLargeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dateButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dateIcon: {
    fontSize: 20,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 100,
  },
});

export default AddTransactionScreen;
