// Budget Stack Navigator

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BudgetStackParamList } from './types';
import BudgetScreen from '../screens/budget/BudgetScreen';
import AddBudgetScreen from '../screens/budget/AddBudgetScreen';
import BudgetDetailScreen from '../screens/budget/BudgetDetailScreen';

const Stack = createStackNavigator<BudgetStackParamList>();

const BudgetNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddBudget"
        component={AddBudgetScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="BudgetDetail"
        component={BudgetDetailScreen}
        options={{
          title: 'Budget Details',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default BudgetNavigator;
