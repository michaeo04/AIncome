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

  const [currency, setCurrency] = useState('VND');
  const [language, setLanguage] = useState('EN');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [goalReminders, setGoalReminders] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        setTheme(data.theme || 'light');
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
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
        <ActivityIndicator size="large" color="#3B82F6" />
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
            Customize the look and feel of the app
          </Text>
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeCard,
                theme === 'light' && styles.themeCardSelected,
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <Text style={styles.themeIcon}>☀️</Text>
              <Text style={styles.themeLabel}>Light</Text>
              {theme === 'light' && <Text style={styles.themeCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeCard,
                theme === 'dark' && styles.themeCardSelected,
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <Text style={styles.themeIcon}>🌙</Text>
              <Text style={styles.themeLabel}>Dark</Text>
              {theme === 'dark' && <Text style={styles.themeCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeCard,
                theme === 'auto' && styles.themeCardSelected,
              ]}
              onPress={() => handleThemeChange('auto')}
            >
              <Text style={styles.themeIcon}>🔄</Text>
              <Text style={styles.themeLabel}>Auto</Text>
              {theme === 'auto' && <Text style={styles.themeCheck}>✓</Text>}
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
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={notifications ? '#3B82F6' : '#F3F4F6'}
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
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={budgetAlerts ? '#3B82F6' : '#F3F4F6'}
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
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={goalReminders ? '#3B82F6' : '#F3F4F6'}
              disabled={!notifications}
            />
          </View>
        </View>

        {/* Info Card */}
        {isSaving && (
          <View style={styles.savingCard}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.savingText}>Saving changes...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionSymbol: {
    fontSize: 24,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 20,
    color: '#3B82F6',
    fontWeight: '700',
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  themeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  themeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '700',
  },
  switchItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  switchIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  switchSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  savingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  savingText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default SettingsScreen;
