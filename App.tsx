import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useThemeStore } from './src/stores/themeStore';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initialize);
  const isDark = useThemeStore((state) => state.isDark);

  useEffect(() => {
    // Initialize both auth and theme
    const init = async () => {
      await Promise.all([
        initializeAuth(),
        initializeTheme(),
      ]);
    };
    init();
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}
