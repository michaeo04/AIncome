// Goals Stack Navigator

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { GoalsStackParamList } from './types';
import GoalsScreen from '../screens/goals/GoalsScreen';
import AddGoalScreen from '../screens/goals/AddGoalScreen';
import GoalDetailScreen from '../screens/goals/GoalDetailScreen';

const Stack = createStackNavigator<GoalsStackParamList>();

const GoalsNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddGoal"
        component={AddGoalScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{
          title: 'Goal Details',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default GoalsNavigator;
