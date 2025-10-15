// Initial Setup Screen - Currency, Category, Balance selection

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';
import { CURRENCIES } from '../../constants';
import { Category } from '../../types';

type InitialSetupScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'InitialSetup'
>;

type SetupStep = 'currency' | 'categories' | 'balance';

const InitialSetupScreen: React.FC = () => {
  const navigation = useNavigation<InitialSetupScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState<SetupStep>('currency');
  const [selectedCurrency, setSelectedCurrency] = useState('VND');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [initialBalance, setInitialBalance] = useState('');
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    if (currentStep === 'categories') {
      fetchDefaultCategories();
    }
  }, [currentStep]);

  const fetchDefaultCategories = async () => {
    setIsFetchingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('user_id', null)
        .order('name');

      if (error) throw error;
      setAvailableCategories(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load categories. Please try again.');
      console.error('Error fetching categories:', error);
    } finally {
      setIsFetchingCategories(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleCurrencyNext = () => {
    setCurrentStep('categories');
  };

  const handleCategoriesNext = () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Please Select', 'Select at least one category to continue.');
      return;
    }
    setCurrentStep('balance');
  };

  const handleSkipBalance = async () => {
    await completeSetup('0');
  };

  const handleBalanceNext = async () => {
    const balance = initialBalance.trim();
    if (balance && isNaN(Number(balance))) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }
    await completeSetup(balance || '0');
  };

  const completeSetup = async (balance: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Create user categories from selected defaults
      const categoriesToCreate = availableCategories
        .filter((cat) => selectedCategories.includes(cat.id))
        .map((cat) => ({
          user_id: user.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
        }));

      const { error: categoriesError } = await supabase
        .from('categories')
        .insert(categoriesToCreate);

      if (categoriesError) throw categoriesError;

      // Update user profile with currency
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ currency: selectedCurrency })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // If initial balance is provided, create an initial income transaction
      if (balance && Number(balance) > 0) {
        // Get the "Opening Balance" category or create it
        const { data: incomeCategories } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .limit(1);

        if (incomeCategories && incomeCategories.length > 0) {
          await supabase.from('transactions').insert({
            user_id: user.id,
            type: 'income',
            amount: Number(balance),
            category_id: incomeCategories[0].id,
            note: 'Initial balance',
            date: new Date().toISOString(),
          });
        }
      }

      // Navigate to personalization screen
      navigation.navigate('Personalization');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
      console.error('Error completing setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'categories') {
      setCurrentStep('currency');
    } else if (currentStep === 'balance') {
      setCurrentStep('categories');
    }
  };

  const renderProgressBar = () => {
    const steps = ['currency', 'categories', 'balance'];
    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    );
  };

  if (currentStep === 'currency') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Select Your Currency</Text>
            <Text style={styles.stepDescription}>
              Choose your preferred currency for tracking finances
            </Text>
          </View>

          <View style={styles.content}>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.optionCard,
                  selectedCurrency === currency.code && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedCurrency(currency.code)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{currency.name}</Text>
                    <Text style={styles.optionSubtitle}>{currency.code}</Text>
                  </View>
                </View>
                {selectedCurrency === currency.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleCurrencyNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentStep === 'categories') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Select Categories</Text>
            <Text style={styles.stepDescription}>
              Choose categories you want to track
            </Text>
          </View>

          <View style={styles.content}>
            {isFetchingCategories ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Income Categories</Text>
                {availableCategories
                  .filter((cat) => cat.type === 'income')
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        selectedCategories.includes(category.id) &&
                          styles.categoryCardSelected,
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <View style={styles.categoryContent}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={styles.categoryName}>{category.name}</Text>
                      </View>
                      {selectedCategories.includes(category.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}

                <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
                  Expense Categories
                </Text>
                {availableCategories
                  .filter((cat) => cat.type === 'expense')
                  .map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        selectedCategories.includes(category.id) &&
                          styles.categoryCardSelected,
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <View style={styles.categoryContent}>
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text style={styles.categoryName}>{category.name}</Text>
                      </View>
                      {selectedCategories.includes(category.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, styles.nextButtonFlex]}
            onPress={handleCategoriesNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentStep === 'balance') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Initial Balance (Optional)</Text>
            <Text style={styles.stepDescription}>
              Enter your current balance or skip this step
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.balanceInputContainer}>
              <Text style={styles.currencyLabel}>
                {CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol}
              </Text>
              <TextInput
                style={styles.balanceInput}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                value={initialBalance}
                onChangeText={setInitialBalance}
                keyboardType="numeric"
                editable={!isLoading}
              />
            </View>
            <Text style={styles.balanceHint}>
              This will be recorded as your opening balance
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipBalance}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, styles.nextButtonFlex]}
            onPress={handleBalanceNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>Finish</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 100,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 32,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  header: {
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencySymbol: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 24,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  categoryCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#1F2937',
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  currencyLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 12,
  },
  balanceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  balanceHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonFlex: {
    flex: 2,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InitialSetupScreen;
