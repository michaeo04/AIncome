import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useThemeStore } from './src/stores/themeStore';
import { supabase } from './src/services/supabase';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initialize);
  const isDark = useThemeStore((state) => state.isDark);
  const setPasswordRecovery = useAuthStore((state) => state.setPasswordRecovery);

  const handleDeepLink = useCallback(
    async (url?: string) => {
      if (!url) return;

      const normalizedUrl = url.toLowerCase();
      const isRecoveryLink =
        normalizedUrl.includes('type=recovery') ||
        normalizedUrl.includes('reset-password') ||
        normalizedUrl.includes('recovery');

      if (!isRecoveryLink) return;

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error('Error exchanging recovery code for session:', error);
          return;
        }

        if (data?.session) {
          setPasswordRecovery(true);
        }
      } catch (exchangeError) {
        console.error('Failed to handle recovery deep link:', exchangeError);
      }
    },
    [setPasswordRecovery]
  );

  useEffect(() => {
    // Initialize both auth and theme
    const init = async () => {
      await Promise.all([
        initializeAuth(),
        initializeTheme(),
      ]);
    };
    init();

    // Handle password recovery deep links (initial + runtime)
    const subscribeToDeepLinks = () => {
      Linking.getInitialURL().then((url) => handleDeepLink(url || undefined));
      const subscription = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
      return () => subscription.remove();
    };

    const cleanup = subscribeToDeepLinks();
    return cleanup;
  }, [handleDeepLink, initializeAuth, initializeTheme]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
