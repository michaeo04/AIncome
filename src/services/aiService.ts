// AI Service - Handles communication with Supabase Edge Functions for AI parsing and chat

import { supabase } from './supabase';
import { ParsedTransaction, Category, ChatMessage, UserPersonalization, ChatIntent, IntentClassificationResult } from '../types';
import {
  getChatbotFinancialContext,
  getLastNMonths,
  getActiveInsights,
  getFinancialHealthInterpretation,
  getSavingsRateInterpretation,
} from './financialAnalyticsService';
import { addThousandSeparators } from '../utils/helpers';

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
  userPersonalization?: UserPersonalization,
  financialContext?: string
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
        } : undefined,
        financialContext: financialContext
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return {
        success: false,
        error: error.message || 'Failed to get AI response'
      };
    }

    if (!data) {
      console.error('❌ No data received from edge function');
      return {
        success: false,
        error: 'No response from AI service'
      };
    }

    if (!data.success) {
      console.error('❌ Edge function returned error:', data.error);
      console.error('❌ Error type:', data.errorType);
      console.error('❌ Error details:', data.details);
      return {
        success: false,
        error: data.error || 'AI service error'
      };
    }

    if (!data.reply) {
      console.error('❌ No reply in response:', JSON.stringify(data));
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

/**
 * Classify user's intent from their message
 * Determines if user wants to create transaction, get financial advice, or just chat
 */
export function classifyIntent(message: string): IntentClassificationResult {
  const lowerMessage = message.toLowerCase().trim();

  // Transaction keywords - high priority
  const transactionKeywords = [
    'mua', 'chi', 'trả', 'đóng', 'nộp', 'ăn', 'uống',
    'nhận', 'được', 'thu', 'lương', 'thưởng', 'bán',
    'triệu', 'nghìn', 'đồng', 'vnd', 'k',
  ];

  // Check if message contains amount patterns (strong indicator of transaction)
  const hasAmount = /\d+(?:\.\d+)?\s*(triệu|tr|tỷ|nghìn|k|đồng|vnd)/i.test(lowerMessage);

  if (hasAmount) {
    return { intent: 'create_transaction', confidence: 0.95 };
  }

  // Check for transaction keywords
  const transactionKeywordCount = transactionKeywords.filter(kw =>
    lowerMessage.includes(kw)
  ).length;

  if (transactionKeywordCount >= 2) {
    return { intent: 'create_transaction', confidence: 0.85 };
  }

  // Financial advice keywords
  const adviceKeywords = [
    'làm sao', 'thế nào', 'như thế nào',
    'tài chính', 'tiết kiệm', 'chi tiêu',
    'ngân sách', 'budget', 'tiền',
    'phân tích', 'báo cáo', 'tóm tắt',
    'xu hướng', 'thay đổi', 'so sánh',
    'tư vấn', 'khuyên', 'nên',
    'có thể', 'được không', 'đủ không',
    'tình hình', 'sức khỏe tài chính',
    'đang', 'đi đâu', 'ở đâu',
    'top', 'nhiều nhất', 'cao nhất',
    'tháng này', 'tháng trước', 'gần đây',
  ];

  // Check for financial advice patterns
  const advicePatterns = [
    /làm sao/i,
    /thế nào/i,
    /như thế nào/i,
    /tôi (có thể|nên|cần)/i,
    /(tiền|chi tiêu|thu nhập|tiết kiệm) (của tôi|tôi)/i,
    /tình hình.*tài chính/i,
    /sức khỏe.*tài chính/i,
    /(đang|đã) (làm|chi|tiêu|tiết kiệm)/i,
    /(tiền|thu nhập|chi tiêu) (đang|đi) (đâu|ở đâu)/i,
    /(báo cáo|phân tích|tóm tắt)/i,
    /nên.*không/i,
    /có thể.*không/i,
  ];

  for (const pattern of advicePatterns) {
    if (pattern.test(lowerMessage)) {
      return { intent: 'financial_advice', confidence: 0.9 };
    }
  }

  const adviceKeywordCount = adviceKeywords.filter(kw =>
    lowerMessage.includes(kw)
  ).length;

  if (adviceKeywordCount >= 2) {
    return { intent: 'financial_advice', confidence: 0.85 };
  }

  if (adviceKeywordCount >= 1) {
    return { intent: 'financial_advice', confidence: 0.7 };
  }

  // Small talk - greetings and general conversation
  const smallTalkKeywords = [
    'xin chào', 'chào', 'hello', 'hi',
    'cảm ơn', 'thanks', 'thank you',
    'tạm biệt', 'bye', 'goodbye',
    'bạn là ai', 'you are', 'what are you',
    'giúp', 'help', 'hỗ trợ',
  ];

  const hasSmalltalk = smallTalkKeywords.some(kw => lowerMessage.includes(kw));

  if (hasSmalltalk) {
    return { intent: 'small_talk', confidence: 0.8 };
  }

  // Default to small_talk with low confidence if uncertain
  return { intent: 'small_talk', confidence: 0.5 };
}

/**
 * Analyze question to determine time period and focus
 * Handles flexible time references like "yesterday", "last week", "last 30 days", etc.
 */
function analyzeQuestion(question: string): {
  timePeriod: 'today' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'quarter' | 'year' | 'last_7_days' | 'last_30_days' | 'custom';
  focus: 'spending' | 'income' | 'savings' | 'budget' | 'goal' | 'category' | 'trend' | 'health' | 'general';
  specificCategory?: string;
} {
  const lowerQ = question.toLowerCase();

  // Detect time period - more flexible patterns
  let timePeriod: any = 'month'; // default

  // Today/Yesterday
  if (lowerQ.includes('hôm nay') || lowerQ.includes('today') || lowerQ.includes('bây giờ')) timePeriod = 'today';
  else if (lowerQ.includes('hôm qua') || lowerQ.includes('yesterday') || lowerQ.includes('ngày hôm qua')) timePeriod = 'yesterday';

  // Week patterns
  else if (lowerQ.includes('tuần trước') || lowerQ.includes('last week')) timePeriod = 'last_week';
  else if (lowerQ.includes('tuần này') || lowerQ.includes('this week') || lowerQ.includes('tuần')) timePeriod = 'week';
  else if (lowerQ.includes('7 ngày') || lowerQ.includes('7 days') || lowerQ.includes('bảy ngày')) timePeriod = 'last_7_days';

  // Month patterns
  else if (lowerQ.includes('tháng trước') || lowerQ.includes('last month')) timePeriod = 'last_month';
  else if (lowerQ.includes('tháng này') || lowerQ.includes('this month') || lowerQ.includes('tháng')) timePeriod = 'month';
  else if (lowerQ.includes('30 ngày') || lowerQ.includes('30 days') || lowerQ.includes('ba mươi ngày')) timePeriod = 'last_30_days';

  // Quarter/Year
  else if (lowerQ.includes('quý') || lowerQ.includes('quarter') || lowerQ.includes('3 tháng')) timePeriod = 'quarter';
  else if (lowerQ.includes('năm') || lowerQ.includes('year') || lowerQ.includes('12 tháng')) timePeriod = 'year';

  // Detect focus - aligned with app features
  let focus: any = 'general';

  // Spending (Transactions - expense type)
  if (lowerQ.includes('chi tiêu') || lowerQ.includes('chi phí') || lowerQ.includes('expense') || lowerQ.includes('tiêu')) focus = 'spending';

  // Income (Transactions - income type)
  else if (lowerQ.includes('thu nhập') || lowerQ.includes('thu') || lowerQ.includes('income') || lowerQ.includes('lương') || lowerQ.includes('kiếm')) focus = 'income';

  // Savings (Net balance analysis)
  else if (lowerQ.includes('tiết kiệm') || lowerQ.includes('saving') || lowerQ.includes('để dành') || lowerQ.includes('dư')) focus = 'savings';

  // Budget (Budget feature in app)
  else if (lowerQ.includes('ngân sách') || lowerQ.includes('budget') || lowerQ.includes('hạn mức')) focus = 'budget';

  // Goals (Saving goals feature)
  else if (lowerQ.includes('mục tiêu') || lowerQ.includes('goal') || lowerQ.includes('đích')) focus = 'goal';

  // Category analysis
  else if (lowerQ.includes('danh mục') || lowerQ.includes('category') || lowerQ.includes('loại')) focus = 'category';

  // Trend analysis (financial metrics)
  else if (lowerQ.includes('xu hướng') || lowerQ.includes('trend') || lowerQ.includes('so sánh') || lowerQ.includes('thay đổi') || lowerQ.includes('tăng') || lowerQ.includes('giảm')) focus = 'trend';

  // Financial health (health score)
  else if (lowerQ.includes('sức khỏe') || lowerQ.includes('health') || lowerQ.includes('tình hình') || lowerQ.includes('tổng quan')) focus = 'health';

  // Try to detect specific category mentions
  let specificCategory: string | undefined;
  const categoryKeywords = [
    'ăn uống', 'food', 'đi lại', 'transport', 'mua sắm', 'shopping',
    'giải trí', 'entertainment', 'sức khỏe', 'health', 'nhà cửa', 'house',
    'giáo dục', 'education', 'tiện ích', 'utilities'
  ];

  for (const keyword of categoryKeywords) {
    if (lowerQ.includes(keyword)) {
      specificCategory = keyword;
      focus = 'category';
      break;
    }
  }

  return { timePeriod, focus, specificCategory };
}

/**
 * Get time-specific financial data
 */
async function getTimeSpecificData(userId: string, timePeriod: string): Promise<any> {
  const now = new Date();
  let startDate: Date;
  let endDate = new Date(now);
  let periodLabel = 'tháng này';

  switch (timePeriod) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = 'hôm nay';
      break;

    case 'yesterday':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = 'hôm qua';
      break;

    case 'week':
    case 'last_7_days':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      periodLabel = '7 ngày qua';
      break;

    case 'last_week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 14);
      endDate = new Date(now);
      endDate.setDate(endDate.getDate() - 7);
      periodLabel = 'tuần trước';
      break;

    case 'month':
    case 'last_30_days':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'tháng này';
      break;

    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = 'tháng trước';
      break;

    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 3);
      periodLabel = 'quý này (3 tháng)';
      break;

    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      periodLabel = 'năm nay (12 tháng)';
      break;

    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodLabel = 'tháng này';
      break;
  }

  // Fetch transactions for the period
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(name, icon, type)')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString())
    .lte('date', endDate.toISOString())
    .order('date', { ascending: false });

  if (!transactions) return null;

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  transactions.forEach(t => {
    const catName = t.category?.name || 'Khác';
    const existing = categoryMap.get(catName) || { amount: 0, count: 0 };
    categoryMap.set(catName, {
      amount: existing.amount + Number(t.amount),
      count: existing.count + 1
    });
  });

  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({ category: name, ...data }))
    .sort((a, b) => b.amount - a.amount);

  return {
    income,
    expense,
    savings: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income * 100) : 0,
    transactionCount: transactions.length,
    categories,
    periodLabel
  };
}

/**
 * Get financial advice based on user's question and their financial data
 */
export async function getFinancialAdvice(
  userId: string,
  question: string,
  userPersonalization?: UserPersonalization
): Promise<string> {
  try {
    // Analyze the question
    const analysis = analyzeQuestion(question);

    // Get user's financial context
    const context = await getChatbotFinancialContext(userId);

    if (!context) {
      return `Tôi chưa có đủ dữ liệu để phân tích tài chính của bạn.

📝 **Để sử dụng tính năng tư vấn tài chính:**

1️⃣ Thêm một số giao dịch (ít nhất 1-2 giao dịch)
2️⃣ Đợi vài giây để hệ thống phân tích
3️⃣ Hỏi lại câu hỏi về tài chính

💡 **Hoặc hãy thử:**
- "Ăn phở 50k" (thêm giao dịch)
- Sau đó hỏi: "Tình hình tài chính của tôi thế nào?"

Nếu bạn đã có nhiều giao dịch nhưng vẫn thấy thông báo này, hãy liên hệ hỗ trợ!`;
    }

    // Get time-specific data based on question analysis
    const periodData = await getTimeSpecificData(userId, analysis.timePeriod);

    // Get recent insights
    const insights = await getActiveInsights(userId);

    // Get trend data
    const last3Months = await getLastNMonths(userId, 3);

    // Get interpretations
    const healthInterp = getFinancialHealthInterpretation(context.financial_health_score);
    const savingsInterp = getSavingsRateInterpretation(context.savings_rate_current);

    // Get personalization-based tone and style
    const getPersonalizedTone = () => {
      if (!userPersonalization) return 'thân thiện và dễ hiểu';

      switch(userPersonalization.communication_style) {
        case 'casual': return 'thân thiện, gần gũi như trò chuyện với bạn bè';
        case 'professional': return 'chuyên nghiệp, trang trọng nhưng vẫn dễ hiểu';
        case 'brief': return 'ngắn gọn, đi thẳng vào vấn đề, không dài dòng';
        case 'detailed': return 'chi tiết, giải thích kỹ càng từng khía cạnh';
        case 'encouraging': return 'động viên, tích cực, hỗ trợ tinh thần';
        default: return 'thân thiện và dễ hiểu';
      }
    };

    const getKnowledgeLevel = () => {
      if (!userPersonalization?.financial_knowledge) return 'người mới bắt đầu';

      switch(userPersonalization.financial_knowledge) {
        case 'beginner': return 'người mới bắt đầu - giải thích đơn giản, tránh thuật ngữ phức tạp';
        case 'intermediate': return 'người có kinh nghiệm - có thể sử dụng thuật ngữ cơ bản';
        case 'advanced': return 'người có kiến thức cao - có thể phân tích chuyên sâu';
        default: return 'người mới bắt đầu';
      }
    };

    // Build comprehensive context for AI with dynamic time period
    const systemPrompt = `
Bạn là trợ lý tài chính cá nhân của ứng dụng AIncome - ứng dụng quản lý chi tiêu thông minh. Nhiệm vụ của bạn là đưa ra lời khuyên tài chính cá nhân hóa dựa trên dữ liệu thực tế từ ứng dụng.

📱 **ỨNG DỤNG AIncome CỦA NGƯỜI DÙNG:**
• Tính năng đang dùng: Theo dõi giao dịch, Ngân sách, Mục tiêu tiết kiệm, Phân tích chi tiêu
• Số dư hiện tại: **${addThousandSeparators(Math.round(context.current_balance), ',')} VND**
• Điểm sức khỏe tài chính: **${context.financial_health_score}/100** (${healthInterp.level})
• Tỷ lệ tiết kiệm: **${context.savings_rate_current.toFixed(1)}%** (${savingsInterp.level})

${periodData ? `
💰 **${periodData.periodLabel.toUpperCase()} (từ giao dịch trong app):**
• Thu nhập: ${addThousandSeparators(Math.round(periodData.income), ',')} VND
• Chi tiêu: ${addThousandSeparators(Math.round(periodData.expense), ',')} VND
• Tiết kiệm được: ${addThousandSeparators(Math.round(periodData.savings), ',')} VND
• Tỷ lệ tiết kiệm: **${periodData.savingsRate.toFixed(1)}%**
• Số giao dịch: ${periodData.transactionCount}

${periodData.categories.length > 0 ? `💸 **TOP DANH MỤC CHI TIÊU ${periodData.periodLabel.toUpperCase()}:**
${periodData.categories.slice(0, 5).map((cat: any, i: number) =>
  `${i + 1}. **${cat.category}**: ${addThousandSeparators(Math.round(cat.amount), ',')} VND (${cat.count} giao dịch)`
).join('\n')}` : ''}
` : `
💰 **THÁNG NÀY (từ giao dịch trong app):**
• Thu nhập: ${addThousandSeparators(Math.round(context.total_income_mtd), ',')} VND
• Chi tiêu: ${addThousandSeparators(Math.round(context.total_expense_mtd), ',')} VND
• Tiết kiệm được: ${addThousandSeparators(Math.round(context.total_income_mtd - context.total_expense_mtd), ',')} VND`}

📊 **TRUNG BÌNH 3 THÁNG (phân tích từ lịch sử app):**
• Thu nhập TB: ${addThousandSeparators(Math.round(context.avg_monthly_income), ',')} VND/tháng
• Chi tiêu TB: ${addThousandSeparators(Math.round(context.avg_monthly_expense), ',')} VND/tháng
• Tỷ lệ tiết kiệm TB: ${context.avg_savings_rate.toFixed(1)}%

🎯 **NGÂN SÁCH TRONG APP:**
• Tổng ngân sách đã tạo: ${context.budgets_exceeded + context.budgets_warning + context.budgets_healthy}
• ⚠️ Vượt mức: ${context.budgets_exceeded} ngân sách
• 🟡 Cảnh báo (>80%): ${context.budgets_warning} ngân sách
• ✅ Lành mạnh: ${context.budgets_healthy} ngân sách
${context.budgets_exceeded > 0 ? '\n⚡ **Khuyến nghị:** Người dùng nên xem lại và điều chỉnh các ngân sách đã vượt mức trong app!' : ''}

📈 **XU HƯỚNG TÀI CHÍNH:**
• Thu nhập: ${context.income_trend === 'increasing' ? '📈 Tăng' : context.income_trend === 'decreasing' ? '📉 Giảm' : '➡️ Ổn định'}
• Chi tiêu: ${context.expense_trend === 'increasing' ? '📈 Tăng' : context.expense_trend === 'decreasing' ? '📉 Giảm' : '➡️ Ổn định'}

🚨 **QUỸ DỰ PHÒNG:**
• Hiện tại: **${context.emergency_fund_months.toFixed(1)} tháng** chi tiêu
• Mục tiêu: 3-6 tháng
${context.emergency_fund_months < 3 ? '⚠️ **Cảnh báo:** Quỹ dự phòng chưa đủ! Khuyến nghị tạo mục tiêu tiết kiệm trong app.' : '✅ Tốt!'}

${insights.length > 0 ? `
💡 **THÔNG BÁO TỪ APP (insights tự động):**
${insights.slice(0, 3).map(insight =>
  `• ${insight.title}: ${insight.message}`
).join('\n')}
` : ''}

${last3Months.length >= 2 ? `
📅 **LỊCH SỬ 3 THÁNG (từ dữ liệu app):**
${last3Months.map(m =>
  `• Tháng ${m.month}/${m.year}: Thu ${addThousandSeparators(Math.round(m.total_income), ',')} | Chi ${addThousandSeparators(Math.round(m.total_expense), ',')} | Tiết kiệm ${m.savings_rate.toFixed(1)}%`
).join('\n')}
` : ''}

👤 **HỒ SƠ NGƯỜI DÙNG (từ onboarding):**
${userPersonalization ? `
• Độ tuổi: ${userPersonalization.age_range || 'Chưa cung cấp'}
• Tình trạng gia đình: ${userPersonalization.family_situation || 'Chưa cung cấp'}
• Mức thu nhập: ${userPersonalization.income_level || 'Chưa cung cấp'}
• Mục tiêu tài chính: ${userPersonalization.financial_goals?.join(', ') || 'Chưa xác định'}
• Kiến thức tài chính: ${getKnowledgeLevel()}
• Mối quan tâm chính: ${userPersonalization.financial_concerns?.join(', ') || 'Chưa xác định'}
• Phong cách giao tiếp ưa thích: ${getPersonalizedTone()}
` : '• Người dùng chưa hoàn thành cá nhân hóa - sử dụng lời khuyên chung'}

📏 **CHUẨN MỰC THAM KHẢO:**
• Tỷ lệ tiết kiệm lý tưởng: 15-20% (hiện tại: ${context.savings_rate_current.toFixed(1)}%)
• Quỹ dự phòng: 3-6 tháng chi tiêu (hiện tại: ${context.emergency_fund_months.toFixed(1)} tháng)
• Tuân thủ ngân sách: 100%

🎯 **BỐI CẢNH CÂU HỎI:**
• Khoảng thời gian: **${periodData?.periodLabel || 'tháng này'}**
• Trọng tâm: **${
  analysis.focus === 'spending' ? 'Chi tiêu (Transactions - type: expense)' :
  analysis.focus === 'income' ? 'Thu nhập (Transactions - type: income)' :
  analysis.focus === 'savings' ? 'Tiết kiệm (Net balance = Thu - Chi)' :
  analysis.focus === 'budget' ? 'Ngân sách (Budgets feature)' :
  analysis.focus === 'goal' ? 'Mục tiêu tiết kiệm (Saving Goals feature)' :
  analysis.focus === 'category' ? 'Phân tích danh mục (Categories breakdown)' :
  analysis.focus === 'trend' ? 'Xu hướng (Financial metrics & trends)' :
  analysis.focus === 'health' ? 'Sức khỏe tài chính (Health score & metrics)' : 'Tổng quan'
}**
${periodData ? `• Dữ liệu **${periodData.periodLabel}** đã được cung cấp → **ưu tiên dùng dữ liệu này**` : ''}
${analysis.specificCategory ? `• Danh mục cụ thể: **${analysis.specificCategory}**` : ''}

✅ **HƯỚNG DẪN TRẢ LỜI (ưu tiên cao):**

1. **Dữ liệu chính xác từ app**:
   - Chỉ dùng số liệu từ dữ liệu phía trên (${periodData?.periodLabel || 'tháng này'})
   - Tham chiếu cụ thể: "Theo dữ liệu từ AIncome", "Giao dịch trong app cho thấy"
   - Trích dẫn số liệu cụ thể: thu nhập, chi tiêu, số giao dịch, danh mục

2. **Tập trung đúng focus**:
   ${analysis.focus === 'spending' ? '→ Phân tích CHI TIÊU: danh mục chi nhiều nhất, chi tiêu bất thường, so với ngân sách' : ''}
   ${analysis.focus === 'income' ? '→ Phân tích THU NHẬP: nguồn thu, tính ổn định, tăng/giảm so với trước' : ''}
   ${analysis.focus === 'savings' ? '→ Phân tích TIẾT KIỆM: số tiền tiết kiệm được, tỷ lệ tiết kiệm, so với mục tiêu' : ''}
   ${analysis.focus === 'budget' ? '→ Phân tích NGÂN SÁCH: budgets_exceeded, budgets_warning, gợi ý điều chỉnh trong app' : ''}
   ${analysis.focus === 'goal' ? '→ Phân tích MỤC TIÊU: goals_on_track, goals_behind, khuyến nghị tạo/cập nhật mục tiêu' : ''}
   ${analysis.focus === 'category' ? '→ Phân tích DANH MỤC: top_spending_categories, phân bổ chi tiêu, đề xuất tối ưu' : ''}
   ${analysis.focus === 'trend' ? '→ Phân tích XU HƯỚNG: income_trend, expense_trend, so sánh 3 tháng, dự đoán' : ''}
   ${analysis.focus === 'health' ? '→ Phân tích SỨC KHỎE: financial_health_score, các chỉ số chính, hành động cải thiện' : ''}

3. **Hành động trong app**:
   - Gợi ý tính năng cụ thể: "Tạo ngân sách trong tab Budget", "Đặt mục tiêu trong tab Goals"
   - Tham chiếu màn hình: "Xem chi tiết trong Analysis", "Kiểm tra trong All Transactions"
   - Hướng dẫn cụ thể: "Nhấn + trong Budget screen để tạo ngân sách mới"

4. **Cá nhân hóa theo user**:
   - Phong cách: ${getPersonalizedTone()}
   - Mức độ: ${getKnowledgeLevel()}
   - Mục tiêu: ${userPersonalization?.financial_goals?.join(', ') || 'Chưa xác định'}
   - Mối quan tâm: ${userPersonalization?.financial_concerns?.join(', ') || 'Chưa xác định'}

5. **Format rõ ràng**:
   - **Bold** cho số liệu quan trọng
   - Emoji phù hợp với nội dung
   - Bullet points cho danh sách
   - Ngắn gọn, dễ đọc trên mobile

❌ **TUYỆT ĐỐI TRÁNH:**
- ❌ Lời khuyên chung chung từ Internet (không dựa trên dữ liệu app)
- ❌ Số liệu sai thời gian (hỏi tuần này mà đưa số liệu tháng)
- ❌ Bỏ qua focus của câu hỏi (hỏi chi tiêu mà nói về thu nhập)
- ❌ Không đề xuất hành động cụ thể trong app
- ❌ Sử dụng ngôn ngữ không phù hợp với user preferences
`;

    // Call Gemini for intelligent response with comprehensive financial context
    const response = await chatWithGemini(
      question,
      [],
      userPersonalization,
      systemPrompt // Pass the comprehensive financial data to the AI
    );

    if (!response.success || !response.reply) {
      // Fallback to basic summary if AI fails
      return generateBasicFinancialSummary(context, healthInterp, savingsInterp);
    }

    return response.reply;
  } catch (error) {
    console.error('Error getting financial advice:', error);
    return 'Xin lỗi, tôi đang gặp sự cố khi phân tích tài chính của bạn. Vui lòng thử lại sau.';
  }
}

/**
 * Generate basic financial summary as fallback
 */
function generateBasicFinancialSummary(
  context: any,
  healthInterp: any,
  savingsInterp: any
): string {
  let summary = `📊 **Tổng Quan Tài Chính**\n\n`;

  summary += `**Điểm Sức Khỏe Tài Chính:** ${context.financial_health_score}/100 (${healthInterp.level})\n`;
  summary += `${healthInterp.description}\n\n`;

  summary += `**Tình Hình Hiện Tại:**\n`;
  summary += `• Số dư: ${addThousandSeparators(Math.round(context.current_balance), ',')} VND\n`;
  summary += `• Thu nhập tháng này: ${addThousandSeparators(Math.round(context.total_income_mtd), ',')} VND\n`;
  summary += `• Chi tiêu tháng này: ${addThousandSeparators(Math.round(context.total_expense_mtd), ',')} VND\n`;
  summary += `• Tỷ lệ tiết kiệm: ${context.savings_rate_current.toFixed(1)}% (${savingsInterp.level})\n\n`;

  if (context.budgets_exceeded > 0) {
    summary += `⚠️ **Cảnh báo:** ${context.budgets_exceeded} ngân sách đã vượt mức\n\n`;
  }

  if (context.emergency_fund_months < 3) {
    summary += `💡 **Khuyến nghị:** Xây dựng quỹ dự phòng để đủ chi tiêu 3-6 tháng\n`;
  }

  if (context.top_spending_categories.length > 0) {
    const topCategory = context.top_spending_categories[0];
    summary += `\n**Chi Tiêu Nhiều Nhất:** ${topCategory.category} (${topCategory.percentage.toFixed(1)}%)\n`;
  }

  return summary;
}
