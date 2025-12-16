// Root Navigator - Main navigation controller

import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import { RootStackParamList } from './types';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { user, isLoading, hasCompletedOnboarding, isPasswordRecovery } = useAuthStore();
  const { theme, isDark } = useThemeStore();

  const linking = useMemo(
    () => ({
      prefixes: [Linking.createURL('/'), 'aincome://'],
      config: {
        screens: {
          Auth: {
            screens: {
              Login: 'login',
              Signup: 'signup',
              ForgotPassword: 'forgot-password',
              ResetPassword: 'reset-password',
            },
          },
        },
      },
    }),
    []
  );

  // Create custom navigation theme based on current theme
  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    };
  }, [isDark, theme]);

  if (isLoading) {
    // TODO: Add proper loading screen
    return null;
  }

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isPasswordRecovery ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
