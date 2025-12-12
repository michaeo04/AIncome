// Supabase Client Configuration

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please configure your .env file.');
}

// Create a custom storage adapter that handles errors gracefully
const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper function to clear corrupted session data
export const clearStorageSession = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key =>
      key.startsWith('supabase.auth.') ||
      key.includes('sb-') ||
      key === 'supabase.auth.token'
    );
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('Cleared Supabase session storage');
    }
  } catch (error) {
    console.warn('Error clearing session storage:', error);
  }
};
