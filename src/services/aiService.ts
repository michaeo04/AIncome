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
 * Get financial advice based on user's question and their financial data
 */
export async function getFinancialAdvice(
  userId: string,
  question: string,
  userPersonalization?: UserPersonalization
): Promise<string> {
  try {
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

    // Get recent insights
    const insights = await getActiveInsights(userId);

    // Get trend data
    const last3Months = await getLastNMonths(userId, 3);

    // Get interpretations
    const healthInterp = getFinancialHealthInterpretation(context.financial_health_score);
    const savingsInterp = getSavingsRateInterpretation(context.savings_rate_current);

    // Build comprehensive context for AI
    const systemPrompt = `
Bạn là một cố vấn tài chính cá nhân thông minh. Hãy cung cấp lời khuyên tài chính dựa trên dữ liệu thực tế của người dùng.

TÌNH HÌNH TÀI CHÍNH HIỆN TẠI:
• Số dư hiện tại: ${context.current_balance.toLocaleString()} VND
• Thu nhập tháng này: ${context.total_income_mtd.toLocaleString()} VND
• Chi tiêu tháng này: ${context.total_expense_mtd.toLocaleString()} VND
• Tỷ lệ tiết kiệm: ${context.savings_rate_current.toFixed(1)}% (${savingsInterp.level})
• Điểm sức khỏe tài chính: ${context.financial_health_score}/100 (${healthInterp.level})

TRUNG BÌNH 3 THÁNG GẦN NHẤT:
• Thu nhập TB: ${context.avg_monthly_income.toLocaleString()} VND
• Chi tiêu TB: ${context.avg_monthly_expense.toLocaleString()} VND
• Tỷ lệ tiết kiệm TB: ${context.avg_savings_rate.toFixed(1)}%

TÌNH TRẠNG NGÂN SÁCH:
• Vượt mức: ${context.budgets_exceeded} ngân sách
• Cảnh báo (80-100%): ${context.budgets_warning} ngân sách
• Lành mạnh: ${context.budgets_healthy} ngân sách

XU HƯỚNG:
• Thu nhập: ${context.income_trend === 'increasing' ? 'Tăng' : context.income_trend === 'decreasing' ? 'Giảm' : 'Ổn định'}
• Chi tiêu: ${context.expense_trend === 'increasing' ? 'Tăng' : context.expense_trend === 'decreasing' ? 'Giảm' : 'Ổn định'}

QUỸ DỰ PHÒNG:
• Hiện tại: ${context.emergency_fund_months.toFixed(1)} tháng chi tiêu
• Mục tiêu khuyến nghị: 3-6 tháng

TOP DANH MỤC CHI TIÊU:
${context.top_spending_categories.slice(0, 5).map((cat, i) =>
  `${i + 1}. ${cat.category}: ${cat.amount.toLocaleString()} VND (${cat.percentage.toFixed(1)}%)`
).join('\n')}

${insights.length > 0 ? `
CÁC THÔNG TIN QUAN TRỌNG:
${insights.slice(0, 3).map(insight =>
  `• ${insight.title}: ${insight.message}`
).join('\n')}
` : ''}

${last3Months.length >= 2 ? `
LỊCH SỬ 3 THÁNG:
${last3Months.map(m =>
  `• Tháng ${m.month}/${m.year}: Thu ${m.total_income.toLocaleString()} | Chi ${m.total_expense.toLocaleString()} | Tiết kiệm ${m.savings_rate.toFixed(1)}%`
).join('\n')}
` : ''}

THÔNG TIN CÁ NHÂN HÓA:
${userPersonalization ? `
• Mục tiêu tài chính: ${userPersonalization.financial_goals?.join(', ') || 'Chưa xác định'}
• Kiến thức tài chính: ${userPersonalization.financial_knowledge || 'Chưa xác định'}
• Mối quan tâm: ${userPersonalization.financial_concerns?.join(', ') || 'Chưa xác định'}
` : 'Chưa có thông tin'}

CHUẨN MỰC THAM KHẢO:
• Tỷ lệ tiết kiệm khuyến nghị: 15-20%
• Quỹ dự phòng mục tiêu: 3-6 tháng chi tiêu
• Tuân thủ ngân sách: 100% hoặc tốt hơn

HÃY:
1. Đưa ra lời khuyên cụ thể, thiết thực dựa trên dữ liệu
2. Động viên nhưng trung thực về các vấn đề cần cải thiện
3. Đề xuất các hành động cụ thể có thể thực hiện
4. Sử dụng ngôn ngữ thân thiện, dễ hiểu
5. So sánh với các chuẩn mực để đưa ra góc nhìn rõ ràng

TRÁNH:
- Đưa ra lời khuyên chung chung không dựa trên dữ liệu
- Chỉ liệt kê số liệu mà không giải thích ý nghĩa
- Sử dụng thuật ngữ phức tạp nếu người dùng là người mới bắt đầu
`;

    // Call Gemini for intelligent response
    const response = await chatWithGemini(question, [], {
      ...userPersonalization,
      has_completed_personalization: userPersonalization?.has_completed_personalization || false,
    });

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
  summary += `• Số dư: ${context.current_balance.toLocaleString()} VND\n`;
  summary += `• Thu nhập tháng này: ${context.total_income_mtd.toLocaleString()} VND\n`;
  summary += `• Chi tiêu tháng này: ${context.total_expense_mtd.toLocaleString()} VND\n`;
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
