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
};

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
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
  TransactionDetail: { transactionId: string };
  AddTransaction: { transactionId?: string };
};

// Budget Stack Navigator
export type BudgetStackParamList = {
  Budget: undefined;
  BudgetDetail: { budgetId: string };
  AddBudget: { budgetId?: string };
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
  CategoryForm: { categoryId?: string };
};
