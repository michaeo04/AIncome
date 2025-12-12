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
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { formatCurrency } from '../../utils/helpers';
import { validateGoalAgainstBalance, showValidationAlert } from '../../utils/validation';
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
  const { theme } = useThemeStore();

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

  const styles = useThemedStyles((theme) => StyleSheet.create({
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
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
      paddingTop: theme.spacing.sm,
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
    previewSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
      backgroundColor: theme.colors.surfaceHover,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.xxl,
    },
    previewIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    previewIconText: {
      fontSize: 40,
    },
    previewName: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    previewAmount: {
      fontSize: 24,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.primary,
    },
    section: {
      marginBottom: theme.spacing.xxl,
    },
    sectionLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    textInput: {
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
      fontSize: theme.fontSize.md,
      color: theme.colors.textPrimary,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    iconButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconButtonSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    iconText: {
      fontSize: 28,
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    colorButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    colorButtonSelected: {
      borderWidth: 3,
      borderColor: theme.colors.textPrimary,
    },
    colorCheckmark: {
      color: theme.colors.textWhite,
      fontSize: 24,
      fontWeight: theme.fontWeight.bold,
    },
    amountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    currencySymbol: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
    },
    amountInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    amountPreview: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      marginLeft: 4,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceHover,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: 14,
    },
    dateButtonText: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    dateButtonLabel: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    calculationCard: {
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    calculationTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    calculationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    calculationLabel: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    calculationValue: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.primary,
    },
    calculationDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 4,
    },
    calculationHint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
    },
    infoCard: {
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    infoHint: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
      marginBottom: 0,
    },
  }));

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

    // In the new allocation system, goals start with 0 allocated
    // Users will allocate money after creating the goal
    await proceedWithSave();
  };

  const proceedWithSave = async () => {
    if (!user) return;

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
            placeholderTextColor={theme.colors.textTertiary}
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
              placeholderTextColor={theme.colors.textTertiary}
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
              After creating this goal, you'll allocate money from your available balance to track progress.
            </Text>
          </View>
        )}

        {/* Info about allocation system */}
        <View style={styles.infoCard}>
          <Text style={styles.calculationTitle}>ℹ️ How It Works</Text>
          <Text style={styles.infoHint}>
            After creating this goal, go to Budget → Savings tab to allocate money. You can transfer money from your available balance to this goal anytime!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default AddGoalScreen;
