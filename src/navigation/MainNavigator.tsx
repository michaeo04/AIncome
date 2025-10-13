// Main Navigator - Bottom Tab Navigation

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import HomeNavigator from './HomeNavigator';
import BudgetNavigator from './BudgetNavigator';
import GoalsNavigator from './GoalsNavigator';
import AnalysisNavigator from './AnalysisNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom floating button for Add Transaction
const FloatingAddButton = () => {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={() => navigation.navigate('HomeTab', {
        screen: 'AddTransaction',
        params: {}
      })}
    >
      <View style={styles.floatingButtonInner}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="BudgetTab"
        component={BudgetNavigator}
        options={{
          tabBarLabel: 'Budget',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />

      {/* Placeholder tab for floating button */}
      <Tab.Screen
        name="AddTab"
        component={View}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <FloatingAddButton />,
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={() => {
                const navigation = props.children?.props?.navigation || props.navigation;
                if (navigation) {
                  navigation.navigate('HomeTab', {
                    screen: 'AddTransaction',
                    params: {}
                  });
                }
              }}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('HomeTab', {
              screen: 'AddTransaction',
              params: {}
            });
          },
        })}
      />

      <Tab.Screen
        name="AnalysisTab"
        component={AnalysisNavigator}
        options={{
          tabBarLabel: 'Analysis',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 85,
    paddingBottom: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  floatingButton: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    zIndex: 10,
  },
  floatingButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
});

export default MainNavigator;
