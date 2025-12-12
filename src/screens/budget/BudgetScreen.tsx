// Budget Screen with Tabs - Budgets and Savings Goals

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import BudgetsTab from './BudgetsTab';
import SavingsGoalsTab from './SavingsGoalsTab';

const Tab = createMaterialTopTabNavigator();

const BudgetScreen: React.FC = () => {
  const { theme } = useThemeStore();

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerGradient: {
      paddingBottom: theme.spacing.md,
      ...theme.shadows.sm,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    headerIcon: {
      fontSize: 24,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.fontSize.xxl,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
  }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.surface, theme.colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Text style={styles.headerIcon}>💰</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Budget & Goals</Text>
              <Text style={styles.headerSubtitle}>
                Manage spending and savings
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
            borderRadius: 2,
          },
          tabBarLabelStyle: {
            fontSize: theme.fontSize.md,
            fontWeight: theme.fontWeight.bold,
            textTransform: 'none',
          },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarPressColor: theme.colors.primaryLight,
        }}
      >
        <Tab.Screen
          name="BudgetsTab"
          component={BudgetsTab}
          options={{
            tabBarLabel: 'Budgets',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20 }}>📊</Text>
            ),
          }}
        />
        <Tab.Screen
          name="SavingsTab"
          component={SavingsGoalsTab}
          options={{
            tabBarLabel: 'Savings',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 20 }}>🎯</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default BudgetScreen;
