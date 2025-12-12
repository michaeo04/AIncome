// Settings Screen - App Preferences and Configuration

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { supabase } from '../../services/supabase';

const CURRENCIES = [
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
];

const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'VI', name: 'Tiếng Việt' },
  { code: 'ES', name: 'Español' },
  { code: 'FR', name: 'Français' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'ZH', name: '中文' },
  { code: 'JA', name: '日本語' },
  { code: 'KO', name: '한국어' },
];

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { theme, isDark, setTheme: setAppTheme } = useThemeStore();

  const [currency, setCurrency] = useState('VND');
  const [language, setLanguage] = useState('EN');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(isDark ? 'dark' : 'light');
  const [notifications, setNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [goalReminders, setGoalReminders] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const styles = useThemedStyles((theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    section: {
      marginBottom: theme.spacing.xxl,
    },
    sectionTitle: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sectionDescription: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    optionsList: {
      gap: theme.spacing.sm,
    },
    optionItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    optionSymbol: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    optionTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    optionSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    checkmark: {
      fontSize: 20,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.bold,
    },
    themeOptions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    themeCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    themeCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    themeIcon: {
      fontSize: 32,
      marginBottom: theme.spacing.sm,
    },
    themeLabel: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    themeCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.bold,
    },
    switchItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    switchLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: theme.spacing.md,
    },
    switchIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    switchTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    switchSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    savingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    savingText: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.fontWeight.semibold,
    },
  }));

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency, language, theme, notifications, budget_alerts, goal_reminders')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setCurrency(data.currency || 'VND');
        setLanguage(data.language || 'EN');
        setThemeMode(data.theme || 'light');
        setNotifications(data.notifications ?? true);
        setBudgetAlerts(data.budget_alerts ?? true);
        setGoalReminders(data.goal_reminders ?? true);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updates: any) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    saveSettings({ currency: newCurrency });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    saveSettings({ language: newLanguage });
    Alert.alert(
      'Language Changed',
      'Language will be applied on next app restart',
      [{ text: 'OK' }]
    );
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setThemeMode(newTheme);
    // Update app theme immediately
    await setAppTheme(newTheme);
    // Also save to database for persistence
    saveSettings({ theme: newTheme });
  };

  const handleNotificationsChange = (value: boolean) => {
    setNotifications(value);
    saveSettings({ notifications: value });
  };

  const handleBudgetAlertsChange = (value: boolean) => {
    setBudgetAlerts(value);
    saveSettings({ budget_alerts: value });
  };

  const handleGoalRemindersChange = (value: boolean) => {
    setGoalReminders(value);
    saveSettings({ goal_reminders: value });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Currency Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <Text style={styles.sectionDescription}>
            Select your preferred currency for displaying amounts
          </Text>
          <View style={styles.optionsList}>
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.code}
                style={[
                  styles.optionItem,
                  currency === curr.code && styles.optionItemSelected,
                ]}
                onPress={() => handleCurrencyChange(curr.code)}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionSymbol}>{curr.symbol}</Text>
                  <View>
                    <Text style={styles.optionTitle}>{curr.name}</Text>
                    <Text style={styles.optionSubtitle}>{curr.code}</Text>
                  </View>
                </View>
                {currency === curr.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          <Text style={styles.sectionDescription}>
            Choose your preferred app language
          </Text>
          <View style={styles.optionsList}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.optionItem,
                  language === lang.code && styles.optionItemSelected,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.optionTitle}>{lang.name}</Text>
                {language === lang.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.sectionDescription}>
            Switch between light and dark mode
          </Text>
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeCard,
                themeMode === 'light' && styles.themeCardSelected,
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <Text style={styles.themeIcon}>☀️</Text>
              <Text style={styles.themeLabel}>Light Mode</Text>
              {themeMode === 'light' && <Text style={styles.themeCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeCard,
                themeMode === 'dark' && styles.themeCardSelected,
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <Text style={styles.themeIcon}>🌙</Text>
              <Text style={styles.themeLabel}>Dark Mode</Text>
              {themeMode === 'dark' && <Text style={styles.themeCheck}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.sectionDescription}>
            Manage your notification preferences
          </Text>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchIcon}>🔔</Text>
              <View>
                <Text style={styles.switchTitle}>Push Notifications</Text>
                <Text style={styles.switchSubtitle}>
                  Receive app notifications
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationsChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={notifications ? theme.colors.primary : theme.colors.surfaceHover}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchIcon}>💰</Text>
              <View>
                <Text style={styles.switchTitle}>Budget Alerts</Text>
                <Text style={styles.switchSubtitle}>
                  Notify when approaching budget limits
                </Text>
              </View>
            </View>
            <Switch
              value={budgetAlerts}
              onValueChange={handleBudgetAlertsChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={budgetAlerts ? theme.colors.primary : theme.colors.surfaceHover}
              disabled={!notifications}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchIcon}>🎯</Text>
              <View>
                <Text style={styles.switchTitle}>Goal Reminders</Text>
                <Text style={styles.switchSubtitle}>
                  Remind about saving goals progress
                </Text>
              </View>
            </View>
            <Switch
              value={goalReminders}
              onValueChange={handleGoalRemindersChange}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={goalReminders ? theme.colors.primary : theme.colors.surfaceHover}
              disabled={!notifications}
            />
          </View>
        </View>

        {/* Info Card */}
        {isSaving && (
          <View style={styles.savingCard}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.savingText}>Saving changes...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;
