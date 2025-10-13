// Add/Edit Budget Screen - Create or Update Budget

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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BudgetStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/helpers';

type AddBudgetScreenNavigationProp = StackNavigationProp<
  BudgetStackParamList,
  'AddBudget'
>;
type AddBudgetScreenRouteProp = RouteProp<BudgetStackParamList, 'AddBudget'>;

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const PERIODS = [
  { value: 'month', label: 'Monthly', days: 30 },
  { value: 'quarter', label: 'Quarterly', days: 90 },
  { value: 'year', label: 'Yearly', days: 365 },
];

const AddBudgetScreen: React.FC = () => {
  const navigation = useNavigation<AddBudgetScreenNavigationProp>();
  const route = useRoute<AddBudgetScreenRouteProp>();
  const { user } = useAuthStore();

  const budgetId = route.params?.budgetId;
  const isEditMode = !!budgetId;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsFetching(true);
    await Promise.all([fetchCategories(), fetchUserCurrency()]);
    if (isEditMode) {
      await fetchBudget();
    }
    setIsFetching(false);
  };

  const fetchCategories = async () => {
    if (!user) return;

    try {
      // Only fetch user-specific categories (created during onboarding)
      // This prevents showing duplicate categories (default + user copies)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, color')
        .eq('type', 'expense')
        .eq('user_id', user.id) // Only user categories
        .order('name');

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

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

  const fetchBudget = async () => {
    if (!user || !budgetId) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedCategory(data.category_id);
        setAmount(data.amount.toString());
        setPeriod(data.period);
        setAlertThreshold(data.alert_threshold);
      }
    } catch (error: any) {
      console.error('Error fetching budget:', error);
      Alert.alert('Error', 'Failed to load budget');
      navigation.goBack();
    }
  };

  const calculateDates = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    let endDate = new Date(startDate);

    if (period === 'month') {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of month
    } else if (period === 'quarter') {
      endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);
    } else if (period === 'year') {
      endDate = new Date(startDate.getFullYear() + 1, 0, 0); // Last day of year
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
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

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      const dates = calculateDates();
      const budgetData = {
        user_id: user.id,
        category_id: selectedCategory,
        amount: Number(amount),
        period,
        start_date: dates.start_date,
        end_date: dates.end_date,
        alert_threshold: alertThreshold,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', budgetId)
          .eq('user_id', user.id);

        if (error) throw error;
        Alert.alert('Success', 'Budget updated successfully');
      } else {
        // Check if budget already exists for this category
        const { data: existing, error: checkError } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', user.id)
          .eq('category_id', selectedCategory)
          .limit(1);

        if (checkError) throw checkError;

        if (existing && existing.length > 0) {
          Alert.alert(
            'Budget Exists',
            'A budget already exists for this category. Please edit the existing budget or choose a different category.'
          );
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.from('budgets').insert([budgetData]);

        if (error) throw error;
        Alert.alert('Success', 'Budget created successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      Alert.alert('Error', error.message || 'Failed to save budget');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id);
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Budget' : 'New Budget'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: category.color + '20' },
                  ]}
                >
                  <Text style={styles.categoryIconText}>{category.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameSelected,
                  ]}
                  numberOfLines={1}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{currency}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              editable={!isLoading}
            />
          </View>
          {amount && Number(amount) > 0 && (
            <Text style={styles.amountPreview}>
              {formatCurrency(Number(amount), currency)}
            </Text>
          )}
        </View>

        {/* Period Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Period</Text>
          <View style={styles.periodContainer}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.periodButton,
                  period === p.value && styles.periodButtonActive,
                ]}
                onPress={() => setPeriod(p.value as any)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    period === p.value && styles.periodButtonTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Alert Threshold */}
        <View style={styles.section}>
          <View style={styles.thresholdHeader}>
            <Text style={styles.sectionLabel}>Alert Threshold</Text>
            <Text style={styles.thresholdValue}>{alertThreshold}%</Text>
          </View>
          <Text style={styles.thresholdDescription}>
            You'll be notified when spending reaches this percentage
          </Text>
          <View style={styles.thresholdSlider}>
            {[70, 75, 80, 85, 90, 95, 100].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.thresholdOption,
                  alertThreshold === value && styles.thresholdOptionActive,
                ]}
                onPress={() => setAlertThreshold(value)}
              >
                <Text
                  style={[
                    styles.thresholdOptionText,
                    alertThreshold === value && styles.thresholdOptionTextActive,
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary Preview */}
        {selectedCategory && amount && Number(amount) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Summary</Text>
            <View style={styles.summaryCard}>
              {getCategoryById(selectedCategory) && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Category</Text>
                  <View style={styles.summaryCategory}>
                    <View
                      style={[
                        styles.summaryCategoryIcon,
                        {
                          backgroundColor:
                            getCategoryById(selectedCategory)!.color + '20',
                        },
                      ]}
                    >
                      <Text style={styles.summaryCategoryIconText}>
                        {getCategoryById(selectedCategory)!.icon}
                      </Text>
                    </View>
                    <Text style={styles.summaryValue}>
                      {getCategoryById(selectedCategory)!.name}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(Number(amount), currency)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Period</Text>
                <Text style={styles.summaryValue}>
                  {PERIODS.find((p) => p.value === period)?.label}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Alert at</Text>
                <Text style={styles.summaryValue}>{alertThreshold}%</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 8,
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
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoryScroll: {
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryItemSelected: {
    opacity: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryIconText: {
    fontSize: 28,
  },
  categoryName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#1F2937',
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  amountPreview: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 4,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  thresholdValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  thresholdDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  thresholdSlider: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thresholdOption: {
    flex: 1,
    minWidth: '12%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  thresholdOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  thresholdOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  thresholdOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCategoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryCategoryIconText: {
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});

export default AddBudgetScreen;
