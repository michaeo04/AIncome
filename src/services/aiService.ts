// AI Service - Handles communication with Supabase Edge Functions for AI parsing and chat

import { supabase } from './supabase';
import { ParsedTransaction, Category, ChatMessage, UserPersonalization } from '../types';

export interface ParseTransactionRequest {
  message: string;
  userId: string;
  categories: Category[];
}

export interface ParseTransactionResponse {
  success: boolean;
  transaction?: ParsedTransaction; // For backward compatibility
  transactions?: ParsedTransaction[]; // For multiple transactions
  error?: string;
}

export interface ChatWithGeminiRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatWithGeminiResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

/**
 * Parse transaction from natural language message using AI
 */
export async function parseTransactionWithAI(
  message: string,
  userId: string,
  categories: Category[]
): Promise<ParseTransactionResponse> {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('parse-transaction', {
      body: {
        message,
        userId,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          type: cat.type,
          icon: cat.icon
        }))
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse transaction'
      };
    }

    // Handle array response (new format)
    if (data && data.transactions && Array.isArray(data.transactions)) {
      return {
        success: true,
        transactions: data.transactions,
        // For backward compatibility, also set single transaction if only one
        transaction: data.transactions.length === 1 ? data.transactions[0] : undefined
      };
    }

    // Handle old single transaction format (backward compatibility)
    if (data && data.transaction) {
      return {
        success: true,
        transaction: data.transaction,
        transactions: [data.transaction]
      };
    }

    return {
      success: false,
      error: 'No transaction data received'
    };
  } catch (error: any) {
    console.error('AI Service error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Parse a single transaction line
 */
function parseSingleTransaction(
  line: string,
  categories: Category[]
): ParsedTransaction | null {
  const normalizedMessage = line.toLowerCase().trim();

  if (!normalizedMessage) return null;

  // Extract amount (look for numbers followed by k, tr, triệu, nghìn, đồng, etc.)
  let amount = 0;
  let confidence = 0.5; // Lower confidence for fallback

  // Pattern: 50k, 100tr, 1.5 triệu, 100 nghìn
  const amountPatterns = [
    { regex: /(\d+(?:\.\d+)?)\s*triệu/i, multiplier: 1000000 },
    { regex: /(\d+(?:\.\d+)?)\s*tr/i, multiplier: 1000000 },
    { regex: /(\d+(?:\.\d+)?)\s*tỷ/i, multiplier: 1000000000 },
    { regex: /(\d+(?:\.\d+)?)\s*nghìn/i, multiplier: 1000 },
    { regex: /(\d+(?:\.\d+)?)\s*k/i, multiplier: 1000 },
    { regex: /(\d+(?:\.\d+)?)\s*đồng/i, multiplier: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*vnd/i, multiplier: 1 },
  ];

  for (const pattern of amountPatterns) {
    const match = normalizedMessage.match(pattern.regex);
    if (match) {
      amount = parseFloat(match[1]) * pattern.multiplier;
      confidence += 0.2;
      break;
    }
  }

  // If no pattern matched, try plain number
  if (amount === 0) {
    const numberMatch = normalizedMessage.match(/\d+/);
    if (numberMatch) {
      amount = parseInt(numberMatch[0]);
      if (amount < 1000) {
        amount *= 1000; // Assume thousands if < 1000
      }
      confidence += 0.1;
    }
  }

  if (amount === 0) {
    return null; // Can't determine amount
  }

  // Determine type (income vs expense)
  const incomeKeywords = ['nhận', 'được', 'thu', 'lương', 'thưởng', 'bán'];
  const expenseKeywords = ['mua', 'chi', 'trả', 'đóng', 'nộp', 'ăn', 'uống'];

  let type: 'income' | 'expense' = 'expense'; // Default to expense

  if (incomeKeywords.some(keyword => normalizedMessage.includes(keyword))) {
    type = 'income';
    confidence += 0.1;
  } else if (expenseKeywords.some(keyword => normalizedMessage.includes(keyword))) {
    type = 'expense';
    confidence += 0.1;
  }

  // Category keyword mappings for better matching
  const categoryKeywords: { [key: string]: string[] } = {
    'ăn uống': ['ăn', 'uống', 'phở', 'cơm', 'bún', 'cà phê', 'cafe', 'trà', 'nước', 'nhà hàng', 'quán', 'đồ ăn', 'thức ăn', 'buffet', 'lẩu', 'bánh', 'kem', 'bữa', 'sáng', 'trưa', 'tối'],
    'đi lại': ['xăng', 'xe', 'taxi', 'grab', 'gojek', 'be', 'xe buýt', 'xe bus', 'tàu', 'máy bay', 'vé', 'di chuyển', 'gửi xe', 'đổ xăng', 'bơm xăng'],
    'mua sắm': ['mua', 'shopping', 'siêu thị', 'chợ', 'quần áo', 'giày', 'dép', 'túi', 'đồ dùng', 'sắm'],
    'giải trí': ['phim', 'xem', 'game', 'vui chơi', 'du lịch', 'karaoke', 'bar', 'pub', 'club', 'gym'],
    'y tế': ['thuốc', 'bác sĩ', 'bệnh viện', 'phòng khám', 'khám', 'chữa', 'sức khỏe', 'đau', 'ốm'],
    'học tập': ['học', 'sách', 'vở', 'bút', 'trường', 'học phí', 'khóa học', 'lớp'],
    'nhà cửa': ['điện', 'nước', 'gas', 'internet', 'wifi', 'thuê nhà', 'nhà', 'phòng', 'tiền điện', 'tiền nước'],
    'lương': ['lương', 'thưởng', 'bonus', 'thu nhập', 'trả lương'],
    'bán hàng': ['bán', 'sell', 'doanh thu'],
  };

  // Find matching category with keyword support
  const categoryMatches = categories
    .filter(cat => cat.type === type)
    .map(cat => {
      let score = 0;
      const catNameLower = cat.name.toLowerCase();

      // Direct name match
      if (normalizedMessage.includes(catNameLower)) {
        score = 1;
      }

      // Check keyword matches
      const keywords = categoryKeywords[catNameLower] || [];
      for (const keyword of keywords) {
        if (normalizedMessage.includes(keyword)) {
          score = Math.max(score, 0.8);
          break;
        }
      }

      return { category: cat, score };
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score);

  let category_id = '';
  let category_name = 'Khác';

  if (categoryMatches.length > 0) {
    category_id = categoryMatches[0].category.id;
    category_name = categoryMatches[0].category.name;
    confidence += 0.2;
  } else {
    // Try to find default "Khác" category
    const defaultCategory = categories.find(
      cat => cat.type === type && (cat.name === 'Khác' || cat.name.toLowerCase() === 'other')
    );

    if (defaultCategory) {
      category_id = defaultCategory.id;
      category_name = defaultCategory.name;
    } else {
      // If no "Khác" category exists, just use the first category of the same type
      const firstCategory = categories.find(cat => cat.type === type);
      if (firstCategory) {
        category_id = firstCategory.id;
        category_name = firstCategory.name;
        confidence -= 0.2; // Lower confidence since we're guessing
      } else {
        // No categories available for this type - can't create transaction
        return null;
      }
    }
  }

  // Extract note (remove amount and common words)
  let note = line
    .replace(/\d+(?:\.\d+)?\s*(triệu|tr|tỷ|nghìn|k|đồng|vnd)/gi, '')
    .replace(/hôm nay|ngày|tháng|năm/gi, '')
    .trim();

  if (note.length > 100) {
    note = note.substring(0, 100);
  }

  return {
    type,
    amount,
    category_id,
    category_name,
    note: note || undefined,
    date: new Date().toISOString(),
    confidence: Math.min(confidence, 0.85) // Cap fallback confidence at 85%
  };
}

/**
 * Fallback parser - Simple rule-based parser for when Edge Function is unavailable
 * Now supports multiple transactions separated by newlines or commas
 */
export function parseTransactionFallback(
  message: string,
  categories: Category[]
): ParsedTransaction | ParsedTransaction[] | null {
  const trimmedMessage = message.trim();

  // Check for multiple transactions
  // Split by newlines first, then by commas if no newlines
  let lines: string[] = [];

  if (trimmedMessage.includes('\n')) {
    // Split by newlines
    lines = trimmedMessage
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } else if (trimmedMessage.includes(',')) {
    // Split by commas (but avoid splitting amounts like "1,500")
    // Look for patterns like "item amount, item amount"
    const parts = trimmedMessage.split(',').map(p => p.trim());

    // Only treat as multiple transactions if each part looks like a transaction
    const looksLikeTransactions = parts.every(part => {
      // Check if part contains a number (amount indicator)
      return /\d+/.test(part);
    });

    if (looksLikeTransactions && parts.length > 1) {
      lines = parts;
    } else {
      // Single transaction
      lines = [trimmedMessage];
    }
  } else {
    // Single transaction
    lines = [trimmedMessage];
  }

  // Parse each line
  const parsedTransactions = lines
    .map(line => parseSingleTransaction(line, categories))
    .filter(t => t !== null) as ParsedTransaction[];

  if (parsedTransactions.length === 0) {
    return null;
  }

  // Return single transaction or array
  return parsedTransactions.length === 1 ? parsedTransactions[0] : parsedTransactions;
}

/**
 * Chat with Gemini AI for general conversation
 * Provides natural, context-aware responses for non-transaction messages
 * Includes user personalization data for tailored responses
 */
export async function chatWithGemini(
  message: string,
  conversationHistory: ChatMessage[] = [],
  userPersonalization?: UserPersonalization
): Promise<ChatWithGeminiResponse> {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('chat-gemini', {
      body: {
        message,
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        userPersonalization: userPersonalization ? {
          financial_goals: userPersonalization.financial_goals,
          financial_knowledge: userPersonalization.financial_knowledge,
          communication_style: userPersonalization.communication_style,
          age_range: userPersonalization.age_range,
          financial_concerns: userPersonalization.financial_concerns,
          income_level: userPersonalization.income_level,
          family_situation: userPersonalization.family_situation,
        } : undefined
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get AI response'
      };
    }

    if (!data || !data.reply) {
      return {
        success: false,
        error: 'No reply received from AI'
      };
    }

    return {
      success: true,
      reply: data.reply
    };
  } catch (error: any) {
    console.error('Chat Service error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}
