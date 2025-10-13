// Onboarding Navigator - Onboarding flow screens

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OnboardingStackParamList } from './types';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import InitialSetupScreen from '../screens/onboarding/InitialSetupScreen';

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="InitialSetup" component={InitialSetupScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
