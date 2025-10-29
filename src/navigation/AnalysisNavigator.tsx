// Analysis Stack Navigator

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AnalysisStackParamList } from './types';
import EnhancedAnalysisScreen from '../screens/analysis/EnhancedAnalysisScreen';

const Stack = createStackNavigator<AnalysisStackParamList>();

const AnalysisNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Analysis"
        component={EnhancedAnalysisScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AnalysisNavigator;
