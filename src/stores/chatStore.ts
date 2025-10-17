// Chat Store - Manages chat messages and conversation state

import { create } from 'zustand';
import { ChatMessage, ParsedTransaction } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  pendingTransaction: ParsedTransaction | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, parsedTransaction?: ParsedTransaction) => void;
  setPendingTransaction: (transaction: ParsedTransaction | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  clearChat: () => void;
  removePendingTransaction: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Chào bạn! 👋 Bạn có thể nói tự nhiên về giao dịch, ví dụ:\n\n"Ăn phở 50k hôm nay"\n"Nhận lương 15 triệu"\n"Mua xăng 200k"\n\nMình sẽ tự động hiểu và đề xuất thông tin cho bạn!',
      timestamp: new Date(),
      type: 'text'
    }
  ],
  isProcessing: false,
  pendingTransaction: null,

  addMessage: (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
  },

  addUserMessage: (content) => {
    get().addMessage({
      role: 'user',
      content,
      type: 'text'
    });
  },

  addAssistantMessage: (content, parsedTransaction) => {
    // Support both single and multiple transactions
    const parsedTransactions = parsedTransaction
      ? (Array.isArray(parsedTransaction) ? parsedTransaction : [parsedTransaction])
      : undefined;

    get().addMessage({
      role: 'assistant',
      content,
      type: parsedTransactions && parsedTransactions.length > 0 ? 'confirmation' : 'text',
      parsedTransaction: parsedTransactions && parsedTransactions.length === 1 ? parsedTransactions[0] : undefined,
      parsedTransactions: parsedTransactions && parsedTransactions.length > 1 ? parsedTransactions : undefined
    });
  },

  setPendingTransaction: (transaction) => {
    set({ pendingTransaction: transaction });
  },

  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  clearChat: () => {
    set({
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Chào bạn! 👋 Bạn có thể nói tự nhiên về giao dịch, ví dụ:\n\n"Ăn phở 50k hôm nay"\n"Nhận lương 15 triệu"\n"Mua xăng 200k"\n\nMình sẽ tự động hiểu và đề xuất thông tin cho bạn!',
          timestamp: new Date(),
          type: 'text'
        }
      ],
      pendingTransaction: null,
      isProcessing: false
    });
  },

  removePendingTransaction: () => {
    set({ pendingTransaction: null });
  }
}));
