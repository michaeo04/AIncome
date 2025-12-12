// Theme Store - Zustand store for theme state management with persistence

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, lightTheme, darkTheme } from '../theme/modernTheme';

const THEME_STORAGE_KEY = '@aincome_theme_mode';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  toggleTheme: () => Promise<void>;
  setTheme: (mode: 'light' | 'dark') => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Initial state - defaults to light theme
  theme: lightTheme,
  isDark: false,
  isLoading: true,

  // Initialize theme from AsyncStorage
  initialize: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);

      if (savedMode === 'dark') {
        set({
          theme: darkTheme,
          isDark: true,
          isLoading: false,
        });
      } else {
        // Default to light theme
        set({
          theme: lightTheme,
          isDark: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // On error, default to light theme
      set({
        theme: lightTheme,
        isDark: false,
        isLoading: false,
      });
    }
  },

  // Toggle between light and dark theme
  toggleTheme: async () => {
    const { isDark } = get();
    const newMode = isDark ? 'light' : 'dark';
    const newTheme = isDark ? lightTheme : darkTheme;

    try {
      // Save preference to AsyncStorage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);

      // Update state
      set({
        theme: newTheme,
        isDark: !isDark,
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  },

  // Set specific theme mode
  setTheme: async (mode: 'light' | 'dark') => {
    const newTheme = mode === 'dark' ? darkTheme : lightTheme;
    const newIsDark = mode === 'dark';

    try {
      // Save preference to AsyncStorage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);

      // Update state
      set({
        theme: newTheme,
        isDark: newIsDark,
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  },
}));
