// Authentication Service - Supabase Auth Operations

import { supabase } from './supabase';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 * NOTE: Email confirmation is disabled in Supabase settings for better mobile UX
 * If you enable email confirmation, configure redirect URL properly in Supabase dashboard
 */
export const signUp = async ({ email, password, name }: SignUpData) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        // Don't require email confirmation for mobile app
        // Configure this in Supabase Dashboard > Authentication > Settings
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data?.user && !data?.session) {
      return {
        data,
        error: null,
        requiresEmailConfirmation: true,
      };
    }

    return { data, error: null, requiresEmailConfirmation: false };
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to sign up', requiresEmailConfirmation: false };
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async ({ email, password }: SignInData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    let errorMessage = error.message || 'Failed to sign in';

    // Provide clearer error messages
    if (errorMessage.toLowerCase().includes('email not confirmed')) {
      errorMessage = 'Please confirm your email address before logging in. Check your inbox for the confirmation email.';
    } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please check your credentials and try again.';
    } else if (errorMessage.toLowerCase().includes('user not found')) {
      errorMessage = 'No account found with this email. Please sign up first.';
    }

    return { data: null, error: errorMessage };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to sign out' };
  }
};

/**
 * Reset password - Send reset email
 */
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'aincome://reset-password',
    });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to send reset email' };
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to update password' };
  }
};

/**
 * Get current session
 */
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};
