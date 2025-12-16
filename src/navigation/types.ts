// Navigation types

import { NavigatorScreenParams } from '@react-navigation/native';

// Root Stack Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
};

// Onboarding Stack Navigator
export type OnboardingStackParamList = {
  Onboarding: undefined;
  InitialSetup: undefined;
  Personalization: undefined;
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  BudgetTab: NavigatorScreenParams<BudgetStackParamList>;
  AddTab: undefined; // Placeholder for floating button
  AnalysisTab: NavigatorScreenParams<AnalysisStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// Home Stack Navigator
export type HomeStackParamList = {
  Home: undefined;
  AllTransactions: undefined;
  TransactionDetail: { transactionId: string };
  AddTransaction: {
    transactionId?: string;
    initialType?: 'income' | 'expense';
    fromPending?: {
      pendingId: string;
      type: 'income' | 'expense';
      amount: number;
      categoryId?: string;
      note?: string;
      date: string;
    };
  };
  PendingTransactions: undefined;
};

// Budget Stack Navigator
export type BudgetStackParamList = {
  Budget: undefined;
  BudgetDetail: { budgetId: string };
  AddBudget: { budgetId?: string };
  AddGoal: { goalId?: string };
  GoalDetail: { goalId: string };
};

// Goals Stack Navigator
export type GoalsStackParamList = {
  Goals: undefined;
  GoalDetail: { goalId: string };
  AddGoal: { goalId?: string };
};

// Analysis Stack Navigator
export type AnalysisStackParamList = {
  Analysis: undefined;
  CategoryBreakdown: undefined;
};

// Profile Stack Navigator
export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  Security: undefined;
  Categories: undefined;
  CategoryForm: {
    categoryId?: string;
    suggestedName?: string;
    type?: 'income' | 'expense';
  };
};
