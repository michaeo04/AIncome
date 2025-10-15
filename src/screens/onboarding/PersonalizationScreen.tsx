// Personalization Onboarding Screen - Collect user preferences for chatbot personalization

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/types';
import {
  FINANCIAL_GOALS,
  FINANCIAL_KNOWLEDGE_LEVELS,
  COMMUNICATION_STYLES,
  AGE_RANGES,
  FINANCIAL_CONCERNS,
  INCOME_LEVELS,
  FAMILY_SITUATIONS,
} from '../../constants/personalization';
import {
  FinancialGoal,
  FinancialKnowledge,
  CommunicationStyle,
  AgeRange,
  FinancialConcern,
  IncomeLevel,
  FamilySituation,
} from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';

type PersonalizationScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'Personalization'
>;

type PersonalizationStep =
  | 'welcome'
  | 'goals'
  | 'knowledge'
  | 'style'
  | 'age'
  | 'concerns'
  | 'income'
  | 'family'
  | 'complete';

const PersonalizationScreen: React.FC = () => {
  const navigation = useNavigation<PersonalizationScreenNavigationProp>();
  const { user } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<PersonalizationStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);

  // Personalization state
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
  const [financialKnowledge, setFinancialKnowledge] = useState<FinancialKnowledge | null>(null);
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle | null>(null);
  const [ageRange, setAgeRange] = useState<AgeRange | null>(null);
  const [financialConcerns, setFinancialConcerns] = useState<FinancialConcern[]>([]);
  const [incomeLevel, setIncomeLevel] = useState<IncomeLevel | null>(null);
  const [familySituation, setFamilySituation] = useState<FamilySituation | null>(null);

  const toggleGoal = (goal: FinancialGoal) => {
    setFinancialGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const toggleConcern = (concern: FinancialConcern) => {
    setFinancialConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const handleNext = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('goals');
    } else if (currentStep === 'goals') {
      if (financialGoals.length === 0) {
        Alert.alert('Please Select', 'Choose at least one financial goal to continue.');
        return;
      }
      setCurrentStep('knowledge');
    } else if (currentStep === 'knowledge') {
      if (!financialKnowledge) {
        Alert.alert('Please Select', 'Choose your financial knowledge level.');
        return;
      }
      setCurrentStep('style');
    } else if (currentStep === 'style') {
      if (!communicationStyle) {
        Alert.alert('Please Select', 'Choose your preferred communication style.');
        return;
      }
      setCurrentStep('age');
    } else if (currentStep === 'age') {
      if (!ageRange) {
        Alert.alert('Please Select', 'Choose your age range.');
        return;
      }
      setCurrentStep('concerns');
    } else if (currentStep === 'concerns') {
      if (financialConcerns.length === 0) {
        Alert.alert('Please Select', 'Choose at least one financial concern to continue.');
        return;
      }
      setCurrentStep('income');
    } else if (currentStep === 'income') {
      if (!incomeLevel) {
        Alert.alert('Please Select', 'Choose your income level.');
        return;
      }
      setCurrentStep('family');
    } else if (currentStep === 'family') {
      if (!familySituation) {
        Alert.alert('Please Select', 'Choose your family situation.');
        return;
      }
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep === 'goals') {
      setCurrentStep('welcome');
    } else if (currentStep === 'knowledge') {
      setCurrentStep('goals');
    } else if (currentStep === 'style') {
      setCurrentStep('knowledge');
    } else if (currentStep === 'age') {
      setCurrentStep('style');
    } else if (currentStep === 'concerns') {
      setCurrentStep('age');
    } else if (currentStep === 'income') {
      setCurrentStep('concerns');
    } else if (currentStep === 'family') {
      setCurrentStep('income');
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user profile with personalization data and mark onboarding as complete
      const { error } = await supabase
        .from('profiles')
        .update({
          financial_goals: financialGoals,
          financial_knowledge: financialKnowledge,
          communication_style: communicationStyle,
          age_range: ageRange,
          financial_concerns: financialConcerns,
          income_level: incomeLevel,
          family_situation: familySituation,
          has_completed_personalization: true,
          has_completed_onboarding: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh user data in authStore to sync state with database
      // This will trigger RootNavigator to automatically switch to Main app
      await useAuthStore.getState().refreshUserData();

      setCurrentStep('complete');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save personalization. Please try again.');
      console.error('Error saving personalization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    Alert.alert(
      'Skip Personalization?',
      'You can always personalize your experience later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              await supabase
                .from('profiles')
                .update({
                  has_completed_personalization: true,
                  has_completed_onboarding: true,
                })
                .eq('id', user.id);

              // Refresh user data to trigger navigation to Main app
              await useAuthStore.getState().refreshUserData();

              setCurrentStep('complete');
            } catch (error) {
              console.error('Error skipping personalization:', error);
            }
          },
        },
      ]
    );
  };

  const renderProgressBar = () => {
    const steps = ['welcome', 'goals', 'knowledge', 'style', 'age', 'concerns', 'income', 'family'];
    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    );
  };

  // Welcome Step
  if (currentStep === 'welcome') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.welcomeIcon}>🤖</Text>
            <Text style={styles.stepTitle}>Personalize Your Assistant</Text>
            <Text style={styles.stepDescription}>
              Help us customize your AI financial assistant to better understand and support your
              unique financial journey. This will take just 2 minutes.
            </Text>
          </View>

          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Tailored Communication</Text>
                <Text style={styles.benefitDescription}>
                  Responses match your preferred style
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎯</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Relevant Advice</Text>
                <Text style={styles.benefitDescription}>
                  Tips aligned with your goals and situation
                </Text>
              </View>
            </View>

            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🌟</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>Better Experience</Text>
                <Text style={styles.benefitDescription}>
                  Feels like talking to someone who knows you
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Let's Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Financial Goals Step
  if (currentStep === 'goals') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>What are your financial goals?</Text>
            <Text style={styles.stepDescription}>Select all that apply</Text>
          </View>

          <View style={styles.content}>
            {FINANCIAL_GOALS.map((goal) => (
              <TouchableOpacity
                key={goal.value}
                style={[
                  styles.optionCard,
                  financialGoals.includes(goal.value as FinancialGoal) &&
                    styles.optionCardSelected,
                ]}
                onPress={() => toggleGoal(goal.value as FinancialGoal)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{goal.icon}</Text>
                  <Text style={styles.optionLabel}>{goal.label}</Text>
                </View>
                {financialGoals.includes(goal.value as FinancialGoal) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Financial Knowledge Step
  if (currentStep === 'knowledge') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Your Financial Knowledge</Text>
            <Text style={styles.stepDescription}>How familiar are you with personal finance?</Text>
          </View>

          <View style={styles.content}>
            {FINANCIAL_KNOWLEDGE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionCardLarge,
                  financialKnowledge === level.value && styles.optionCardSelected,
                ]}
                onPress={() => setFinancialKnowledge(level.value as FinancialKnowledge)}
              >
                <Text style={styles.optionIconLarge}>{level.icon}</Text>
                <Text style={styles.optionLabelLarge}>{level.label}</Text>
                <Text style={styles.optionDescription}>{level.description}</Text>
                {financialKnowledge === level.value && (
                  <Text style={styles.checkmarkLarge}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Communication Style Step
  if (currentStep === 'style') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Communication Style</Text>
            <Text style={styles.stepDescription}>How would you like me to talk to you?</Text>
          </View>

          <View style={styles.content}>
            {COMMUNICATION_STYLES.map((style) => (
              <TouchableOpacity
                key={style.value}
                style={[
                  styles.optionCardLarge,
                  communicationStyle === style.value && styles.optionCardSelected,
                ]}
                onPress={() => setCommunicationStyle(style.value as CommunicationStyle)}
              >
                <Text style={styles.optionIconLarge}>{style.icon}</Text>
                <Text style={styles.optionLabelLarge}>{style.label}</Text>
                <Text style={styles.optionDescription}>{style.description}</Text>
                {communicationStyle === style.value && (
                  <Text style={styles.checkmarkLarge}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Age Range Step
  if (currentStep === 'age') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Your Age Range</Text>
            <Text style={styles.stepDescription}>This helps us give age-appropriate advice</Text>
          </View>

          <View style={styles.content}>
            {AGE_RANGES.map((range) => (
              <TouchableOpacity
                key={range.value}
                style={[
                  styles.optionCard,
                  ageRange === range.value && styles.optionCardSelected,
                ]}
                onPress={() => setAgeRange(range.value as AgeRange)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{range.icon}</Text>
                  <Text style={styles.optionLabel}>{range.label}</Text>
                </View>
                {ageRange === range.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Financial Concerns Step
  if (currentStep === 'concerns') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Main Financial Concerns</Text>
            <Text style={styles.stepDescription}>What worries you most? (Select all that apply)</Text>
          </View>

          <View style={styles.content}>
            {FINANCIAL_CONCERNS.map((concern) => (
              <TouchableOpacity
                key={concern.value}
                style={[
                  styles.optionCard,
                  financialConcerns.includes(concern.value as FinancialConcern) &&
                    styles.optionCardSelected,
                ]}
                onPress={() => toggleConcern(concern.value as FinancialConcern)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{concern.icon}</Text>
                  <Text style={styles.optionLabel}>{concern.label}</Text>
                </View>
                {financialConcerns.includes(concern.value as FinancialConcern) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Income Level Step
  if (currentStep === 'income') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Income Level</Text>
            <Text style={styles.stepDescription}>This helps us provide relevant advice</Text>
          </View>

          <View style={styles.content}>
            {INCOME_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionCard,
                  incomeLevel === level.value && styles.optionCardSelected,
                ]}
                onPress={() => setIncomeLevel(level.value as IncomeLevel)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{level.icon}</Text>
                  <Text style={styles.optionLabel}>{level.label}</Text>
                </View>
                {incomeLevel === level.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextButton, styles.nextButtonFlex]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Family Situation Step
  if (currentStep === 'family') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderProgressBar()}
          <View style={styles.header}>
            <Text style={styles.stepTitle}>Family Situation</Text>
            <Text style={styles.stepDescription}>Helps us understand your financial context</Text>
          </View>

          <View style={styles.content}>
            {FAMILY_SITUATIONS.map((situation) => (
              <TouchableOpacity
                key={situation.value}
                style={[
                  styles.optionCard,
                  familySituation === situation.value && styles.optionCardSelected,
                ]}
                onPress={() => setFamilySituation(situation.value as FamilySituation)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>{situation.icon}</Text>
                  <Text style={styles.optionLabel}>{situation.label}</Text>
                </View>
                {familySituation === situation.value && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, styles.nextButtonFlex]}
            onPress={handleNext}
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

  // Complete Step - Show success message and let RootNavigator handle navigation
  if (currentStep === 'complete') {
    return (
      <View style={styles.container}>
        <View style={styles.completeContainer}>
          <Text style={styles.completeIcon}>🎉</Text>
          <Text style={styles.completeTitle}>All Set!</Text>
          <Text style={styles.completeDescription}>
            Your AI assistant is now personalized and ready to help you manage your finances.
          </Text>
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Taking you to the app...</Text>
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
  welcomeIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  benefitsContainer: {
    gap: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  benefitIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  optionIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  checkmark: {
    fontSize: 24,
    color: '#3B82F6',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  optionCardLarge: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  optionIconLarge: {
    fontSize: 48,
    marginBottom: 12,
  },
  optionLabelLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  checkmarkLarge: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 28,
    color: '#3B82F6',
    fontWeight: 'bold',
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
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completeIcon: {
    fontSize: 100,
    marginBottom: 24,
  },
  completeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  completeDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  doneButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PersonalizationScreen;
