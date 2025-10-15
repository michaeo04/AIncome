// Auth Store - Zustand store for authentication state

import { create } from 'zustand';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  refreshUserData: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  checkOnboardingStatus: (userId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  hasCompletedOnboarding: false,

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  setOnboardingCompleted: async (completed) => {
    try {
      const { user } = get();
      if (!user) return;

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: completed })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating onboarding status:', error);
        return;
      }

      set({ hasCompletedOnboarding: completed });
    } catch (error) {
      console.error('Error setting onboarding completed:', error);
    }
  },

  refreshUserData: async () => {
    try {
      const { user } = get();
      if (!user) return;

      // Fetch latest user profile from database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error refreshing user data:', error);
        return;
      }

      if (profile) {
        // Update user data and onboarding status
        set({
          user: profile as User,
          hasCompletedOnboarding: profile.has_completed_onboarding || false,
        });
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  },

  checkOnboardingStatus: async (userId: string): Promise<boolean> => {
    try {
      // 1. Check database flag first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_completed_onboarding')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return false;
      }

      // If flag is true in database, return true
      if (profile?.has_completed_onboarding) {
        return true;
      }

      // 2. If flag is false, check if user has any data (for existing accounts)
      // Check for transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!txError && transactions && transactions.length > 0) {
        // User has transactions, mark onboarding as completed
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', userId);
        return true;
      }

      // Check for user-created categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!catError && categories && categories.length > 0) {
        // User has categories, mark onboarding as completed
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', userId);
        return true;
      }

      // Check for budgets
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!budgetError && budgets && budgets.length > 0) {
        // User has budgets, mark onboarding as completed
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', userId);
        return true;
      }

      // Check for goals
      const { data: goals, error: goalsError } = await supabase
        .from('saving_goals')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!goalsError && goals && goals.length > 0) {
        // User has goals, mark onboarding as completed
        await supabase
          .from('profiles')
          .update({ has_completed_onboarding: true })
          .eq('id', userId);
        return true;
      }

      // No data found, user needs onboarding
      return false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, hasCompletedOnboarding: false });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          set({ user: null, isLoading: false });
          return;
        }

        // Check onboarding status from database + data check
        const hasCompleted = await get().checkOnboardingStatus(session.user.id);

        set({
          user: profile as User,
          hasCompletedOnboarding: hasCompleted,
          isLoading: false,
        });
      } else {
        set({ user: null, hasCompletedOnboarding: false, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            // Check onboarding status for the newly signed-in user
            const hasCompleted = await get().checkOnboardingStatus(session.user.id);

            set({
              user: profile as User,
              hasCompletedOnboarding: hasCompleted,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, hasCompletedOnboarding: false });
        }
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isLoading: false });
    }
  },
}));
