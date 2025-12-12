// Profile Screen - User Settings and Options

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { supabase } from '../../services/supabase';

type ProfileScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  'Profile'
>;

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  language: string;
  theme: string;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, signOut } = useAuthStore();
  const { theme } = useThemeStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      paddingBottom: 40,
    },
    headerGradient: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      ...theme.shadows.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.secondaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      ...theme.shadows.sm,
    },
    headerIcon: {
      fontSize: 28,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.fontSize.xxxl,
      fontWeight: theme.fontWeight.extrabold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    headerSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.fontWeight.medium,
    },
    userCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xxl,
      alignItems: 'center',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xxl,
      ...theme.shadows.md,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: theme.spacing.lg,
    },
    avatarImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 40,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textWhite,
    },
    editBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    editBadgeText: {
      fontSize: 14,
    },
    userName: {
      fontSize: 22,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceHover,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      width: '100%',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: theme.fontSize.xs,
      color: theme.colors.textSecondary,
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: theme.colors.border,
    },
    section: {
      marginBottom: theme.spacing.xxl,
      marginHorizontal: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.fontSize.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    menuItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    menuIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    menuContent: {
      flex: 1,
    },
    menuTitle: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: theme.fontSize.sm,
      color: theme.colors.textSecondary,
    },
    menuArrow: {
      fontSize: 24,
      color: theme.colors.textTertiary,
      fontWeight: '300',
    },
    logoutText: {
      color: theme.colors.danger,
    },
    footer: {
      textAlign: 'center',
      fontSize: theme.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.lg,
    },
  }));

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, currency, language, theme')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadProfile();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleHelpFAQ = () => {
    Alert.alert(
      'Help & FAQ',
      'Need help with AIncome?\n\nCommon topics:\n• How to add transactions\n• Managing budgets\n• Setting up saving goals\n• Understanding reports',
      [
        { text: 'OK' },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About AIncome',
      'AIncome - Personal Finance Tracker\n\nVersion: 1.0.0\n\nA comprehensive mobile app for managing your income, expenses, budgets, and financial goals.\n\nBuilt with React Native & Supabase',
      [
        { text: 'OK' },
      ]
    );
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      // If it's a full URL, return it
      if (profile.avatar_url.startsWith('http')) {
        return profile.avatar_url;
      }
      // Otherwise, construct the Supabase Storage URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(profile.avatar_url);
      return data.publicUrl;
    }
    return null;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.surfaceHover]}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Text style={styles.headerIcon}>👤</Text>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Profile & Settings</Text>
                <Text style={styles.headerSubtitle}>Manage your account</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* User Info Card */}
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => navigation.navigate('EditProfile')}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {getAvatarUrl() ? (
              <Image
                source={{ uri: getAvatarUrl()! }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.full_name
                    ? profile.full_name.charAt(0).toUpperCase()
                    : user?.email?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </View>
          <Text style={styles.userName}>
            {profile?.full_name || 'Set your name'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.currency || 'VND'}</Text>
              <Text style={styles.statLabel}>Currency</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.theme === 'dark' ? '🌙' : '☀️'}
              </Text>
              <Text style={styles.statLabel}>Theme</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.language || 'EN'}</Text>
              <Text style={styles.statLabel}>Language</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.menuIcon}>⚙️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Settings</Text>
              <Text style={styles.menuSubtitle}>
                Currency, theme, language preferences
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Categories')}
          >
            <Text style={styles.menuIcon}>📂</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Categories</Text>
              <Text style={styles.menuSubtitle}>
                Manage income and expense categories
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Security')}
          >
            <Text style={styles.menuIcon}>🔒</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Security</Text>
              <Text style={styles.menuSubtitle}>
                Password, privacy, account management
              </Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleHelpFAQ}>
            <Text style={styles.menuIcon}>📖</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & FAQ</Text>
              <Text style={styles.menuSubtitle}>Get help and support</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <Text style={styles.menuIcon}>ℹ️</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>About</Text>
              <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Text style={styles.menuIcon}>🚪</Text>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.logoutText]}>Sign Out</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Made with ❤️ for better financial management
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
