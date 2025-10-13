// Add/Edit Goal Screen - Create or Update Saving Goal

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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GoalsStackParamList } from '../../navigation/types';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/helpers';
import DateTimePicker from '@react-native-community/datetimepicker';
import { differenceInMonths, addMonths } from 'date-fns';

type AddGoalScreenNavigationProp = StackNavigationProp<
  GoalsStackParamList,
  'AddGoal'
>;
type AddGoalScreenRouteProp = RouteProp<GoalsStackParamList, 'AddGoal'>;

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '🎓', '💰', '🏖️', '🎁', '📱', '💻', '🎸'];
const GOAL_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  '#6366F1', '#84CC16', '#06B6D4', '#A855F7',
];

const AddGoalScreen: React.FC = () => {
  const navigation = useNavigation<AddGoalScreenNavigationProp>();
  const route = useRoute<AddGoalScreenRouteProp>();
  const { user } = useAuthStore();

  const goalId = route.params?.goalId;
  const isEditMode = !!goalId;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [targetDate, setTargetDate] = useState(addMonths(new Date(), 6));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsFetching(true);
    await fetchUserCurrency();
    if (isEditMode) {
      await fetchGoal();
    }
    setIsFetching(false);
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

  const fetchGoal = async () => {
    if (!user || !goalId) return;

    try {
      const { data, error } = await supabase
        .from('saving_goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name);
        setTargetAmount(data.target_amount.toString());
        setSelectedIcon(data.icon);
        setSelectedColor(data.color);
        setTargetDate(new Date(data.target_date));
      }
    } catch (error: any) {
      console.error('Error fetching goal:', error);
      Alert.alert('Error', 'Failed to load goal');
      navigation.goBack();
    }
  };

  const calculateMonthlyRate = () => {
    if (!targetAmount || isNaN(Number(targetAmount))) return 0;

    const today = new Date();
    const months = Math.max(differenceInMonths(targetDate, today), 1);
    return Number(targetAmount) / months;
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a goal name');
      return false;
    }

    if (!targetAmount || isNaN(Number(targetAmount)) || Number(targetAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid target amount greater than 0');
      return false;
    }

    if (targetDate <= new Date()) {
      Alert.alert('Invalid Date', 'Target date must be in the future');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      const goalData = {
        user_id: user.id,
        name: name.trim(),
        target_amount: Number(targetAmount),
        target_date: targetDate.toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
        icon: selectedIcon,
        color: selectedColor,
        status: 'active',
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('saving_goals')
          .update(goalData)
          .eq('id', goalId)
          .eq('user_id', user.id);

        if (error) throw error;
        Alert.alert('Success', 'Goal updated successfully');
      } else {
        const { error } = await supabase.from('saving_goals').insert([goalData]);

        if (error) throw error;
        Alert.alert('Success', 'Goal created successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      Alert.alert('Error', error.message || 'Failed to save goal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const monthlyRate = calculateMonthlyRate();

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
            {isEditMode ? 'Edit Goal' : 'New Goal'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Text style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Goal Preview */}
        <View style={styles.previewSection}>
          <View
            style={[
              styles.previewIcon,
              { backgroundColor: selectedColor + '20' },
            ]}
          >
            <Text style={styles.previewIconText}>{selectedIcon}</Text>
          </View>
          <Text style={styles.previewName}>{name || 'Goal Name'}</Text>
          <Text style={styles.previewAmount}>
            {targetAmount
              ? formatCurrency(Number(targetAmount), currency)
              : formatCurrency(0, currency)}
          </Text>
        </View>

        {/* Goal Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Goal Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Save for vacation"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />
        </View>

        {/* Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose Icon</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map((icon, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.iconButton,
                  selectedIcon === icon && styles.iconButtonSelected,
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose Color</Text>
          <View style={styles.colorGrid}>
            {GOAL_COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorButtonSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Text style={styles.colorCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Amount</Text>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>{currency}</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
              editable={!isLoading}
            />
          </View>
          {targetAmount && Number(targetAmount) > 0 && (
            <Text style={styles.amountPreview}>
              {formatCurrency(Number(targetAmount), currency)}
            </Text>
          )}
        </View>

        {/* Target Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>📅</Text>
            <Text style={styles.dateButtonLabel}>
              {targetDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Savings Calculation */}
        {targetAmount && Number(targetAmount) > 0 && (
          <View style={styles.calculationCard}>
            <Text style={styles.calculationTitle}>💡 Saving Plan</Text>
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Monthly Rate Needed:</Text>
              <Text style={styles.calculationValue}>
                {formatCurrency(monthlyRate, currency)}
              </Text>
            </View>
            <View style={styles.calculationDivider} />
            <View style={styles.calculationRow}>
              <Text style={styles.calculationLabel}>Time to Save:</Text>
              <Text style={styles.calculationValue}>
                {Math.max(differenceInMonths(targetDate, new Date()), 1)} months
              </Text>
            </View>
            <Text style={styles.calculationHint}>
              Save {formatCurrency(monthlyRate, currency)} per month to reach your goal
            </Text>
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
  previewSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 24,
  },
  previewIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewIconText: {
    fontSize: 40,
  },
  previewName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
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
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  iconText: {
    fontSize: 28,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#1F2937',
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: {
    fontSize: 24,
    marginRight: 12,
  },
  dateButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  calculationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calculationLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  calculationDivider: {
    height: 1,
    backgroundColor: '#DBEAFE',
    marginVertical: 4,
  },
  calculationHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default AddGoalScreen;
