// Analysis Stack Navigator

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AnalysisStackParamList } from './types';
import AnalysisScreen from '../screens/analysis/AnalysisScreen';

const Stack = createStackNavigator<AnalysisStackParamList>();

const AnalysisNavigator: React.FC = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AnalysisNavigator;
