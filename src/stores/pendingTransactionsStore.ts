// Zustand Store - Pending Transactions Management
// ================================================
// Manages the state and operations for bank transaction notifications
// that are awaiting user review and confirmation

import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { PendingTransaction } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PendingTransactionsState {
  // State
  pendingTransactions: PendingTransaction[];
  isLoading: boolean;
  realtimeChannel: RealtimeChannel | null;

  // Actions
  fetchPending: (userId: string) => Promise<void>;
  updatePending: (id: string, updates: Partial<PendingTransaction>) => Promise<void>;
  confirmPending: (id: string) => Promise<void>;
  rejectPending: (id: string) => Promise<void>;
  subscribeToRealtimeUpdates: (userId: string) => void;
  unsubscribeFromRealtime: () => void;
}

export const usePendingTransactionsStore = create<PendingTransactionsState>((set, get) => ({
  // ========================================
  // INITIAL STATE
  // ========================================

  pendingTransactions: [],
  isLoading: false,
  realtimeChannel: null,

  // ========================================
  // ACTIONS
  // ========================================

  /**
   * Fetch all pending transactions for a user
   * Only fetches transactions with status='pending'
   */
  fetchPending: async (userId: string) => {
    console.log('🔄 Fetching pending transactions for user:', userId);
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('pending_transactions')
        .select(`
          *,
          parsed_category:categories(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching pending transactions:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} pending transactions`);
      if (data && data.length > 0) {
        console.log('📋 Pending transactions data:', data);
      }

      set({ pendingTransactions: data || [] });
    } catch (error) {
      console.error('❌ Failed to fetch pending transactions:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Update a pending transaction (e.g., edit amount, category, note)
   * Used when user wants to correct AI-parsed data before confirming
   */
  updatePending: async (id: string, updates: Partial<PendingTransaction>) => {
    try {
      const { error } = await supabase
        .from('pending_transactions')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating pending transaction:', error);
        throw error;
      }

      // Update local state optimistically
      set((state) => ({
        pendingTransactions: state.pendingTransactions.map((txn) =>
          txn.id === id ? { ...txn, ...updates } : txn
        ),
      }));
    } catch (error) {
      console.error('Failed to update pending transaction:', error);
      throw error;
    }
  },

  /**
   * Confirm a pending transaction
   * Moves the transaction from pending_transactions to transactions table
   * Then removes it from the pending queue
   */
  confirmPending: async (id: string) => {
    try {
      const pending = get().pendingTransactions.find((txn) => txn.id === id);
      if (!pending) {
        throw new Error('Pending transaction not found');
      }

      // Insert into main transactions table
      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: pending.user_id,
          type: pending.parsed_type,
          amount: pending.parsed_amount,
          category_id: pending.parsed_category_id,
          note: pending.parsed_note,
          date: pending.parsed_date,
        });

      if (insertError) {
        console.error('Error inserting transaction:', insertError);
        throw insertError;
      }

      // Delete from pending_transactions table
      const { error: deleteError } = await supabase
        .from('pending_transactions')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting pending transaction:', deleteError);
        throw deleteError;
      }

      // Remove from local state
      set((state) => ({
        pendingTransactions: state.pendingTransactions.filter((txn) => txn.id !== id),
      }));
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      throw error;
    }
  },

  /**
   * Reject a pending transaction
   * Permanently removes it from the pending queue without adding to transactions
   */
  rejectPending: async (id: string) => {
    try {
      const { error } = await supabase
        .from('pending_transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error rejecting pending transaction:', error);
        throw error;
      }

      // Remove from local state
      set((state) => ({
        pendingTransactions: state.pendingTransactions.filter((txn) => txn.id !== id),
      }));
    } catch (error) {
      console.error('Failed to reject transaction:', error);
      throw error;
    }
  },

  /**
   * Subscribe to realtime updates for pending transactions
   * Listens for INSERT, UPDATE, DELETE events on pending_transactions table
   * Automatically updates the local state when changes occur
   */
  subscribeToRealtimeUpdates: (userId: string) => {
    // Unsubscribe from existing channel if any
    get().unsubscribeFromRealtime();

    console.log(`📡 Subscribing to pending transactions realtime for user: ${userId}`);

    const channel = supabase
      .channel('pending-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📥 ✨ NEW PENDING TRANSACTION RECEIVED VIA REALTIME:', payload);
          console.log('📄 New transaction data:', payload.new);

          // Add to the beginning of the list (most recent first)
          set((state) => ({
            pendingTransactions: [
              payload.new as PendingTransaction,
              ...state.pendingTransactions,
            ],
          }));

          console.log('✅ Added to pending transactions list');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pending_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Pending transaction updated:', payload);

          set((state) => ({
            pendingTransactions: state.pendingTransactions.map((txn) =>
              txn.id === payload.new.id ? (payload.new as PendingTransaction) : txn
            ),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pending_transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🗑️ Pending transaction deleted:', payload);

          set((state) => ({
            pendingTransactions: state.pendingTransactions.filter(
              (txn) => txn.id !== payload.old.id
            ),
          }));
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to pending transactions realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error');
        }
      });

    set({ realtimeChannel: channel });
    console.log('📡 Realtime channel created and stored');
  },

  /**
   * Unsubscribe from realtime updates
   * Call this when component unmounts to prevent memory leaks
   */
  unsubscribeFromRealtime: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      console.log('📴 Unsubscribing from pending transactions realtime updates');
      supabase.removeChannel(channel);
      set({ realtimeChannel: null });
    }
  },
}));
