// Intent Classifier - Lightweight rule-based classifier for chat messages

import { ChatIntent, IntentClassificationResult } from '../types';

// Keywords that indicate transaction creation intent
const TRANSACTION_KEYWORDS = {
  // Vietnamese transaction verbs
  verbs: [
    'mua', 'bán', 'chi', 'thu', 'trả', 'nạp', 'nộp', 'đóng',
    'ăn', 'uống', 'mượn', 'cho vay', 'vay', 'nhận', 'được',
    'tiêu', 'tiết kiệm', 'gửi', 'rút', 'chuyển'
  ],

  // Money-related words
  money: [
    'đồng', 'nghìn', 'triệu', 'tỷ', 'k', 'tr', 'vnd', 'đ',
    'tiền', 'giá', 'phí', 'cước', 'lương', 'thưởng'
  ],

  // Common expense categories
  categories: [
    'phở', 'cơm', 'xăng', 'điện', 'nước', 'cà phê', 'cafe',
    'trà', 'thuốc', 'xe', 'taxi', 'grab', 'siêu thị', 'chợ',
    'quần áo', 'giày', 'phim', 'game', 'sách', 'học phí'
  ],

  // Time indicators (suggests recording a transaction)
  time: [
    'hôm nay', 'ngày', 'tháng', 'năm', 'tuần', 'hôm qua',
    'sáng', 'chiều', 'tối', 'trưa', 'vừa', 'mới'
  ]
};

// Keywords that indicate casual conversation
const SMALL_TALK_KEYWORDS = {
  greetings: [
    'chào', 'xin chào', 'hello', 'hi', 'hey', 'helo',
    'alo', 'alô', 'chào bạn', 'chào anh', 'chào chị'
  ],
  questions: [
    'là gì', 'thế nào', 'như thế nào', 'sao', 'tại sao',
    'làm sao', 'khi nào', 'ở đâu', 'ai', 'có thể'
  ],
  thanks: [
    'cảm ơn', 'thanks', 'thank you', 'cám ơn', 'tks', 'ty'
  ],
  goodbyes: [
    'tạm biệt', 'bye', 'goodbye', 'hẹn gặp', 'bái bai'
  ]
};

/**
 * Classifies user intent from message
 * Returns intent type and confidence score
 */
export function classifyIntent(message: string): IntentClassificationResult {
  const normalizedMessage = message.toLowerCase().trim();

  // Empty message
  if (!normalizedMessage) {
    return { intent: 'unknown', confidence: 0 };
  }

  // Check for small talk patterns first
  const smallTalkScore = calculateSmallTalkScore(normalizedMessage);

  // Check for transaction patterns
  const transactionScore = calculateTransactionScore(normalizedMessage);

  // Decision logic
  if (transactionScore > smallTalkScore && transactionScore > 0.3) {
    return {
      intent: 'create_transaction',
      confidence: Math.min(transactionScore, 0.95)
    };
  }

  if (smallTalkScore > 0.5) {
    return {
      intent: 'small_talk',
      confidence: Math.min(smallTalkScore, 0.9)
    };
  }

  // If message contains numbers, likely a transaction
  if (/\d+/.test(normalizedMessage) && transactionScore > 0.2) {
    return {
      intent: 'create_transaction',
      confidence: 0.7
    };
  }

  // Default to unknown
  return { intent: 'unknown', confidence: 0.5 };
}

/**
 * Calculate score for small talk intent
 */
function calculateSmallTalkScore(message: string): number {
  let score = 0;
  let matches = 0;

  // Check greetings
  for (const keyword of SMALL_TALK_KEYWORDS.greetings) {
    if (message.includes(keyword)) {
      score += 0.4;
      matches++;
      break; // Only count once
    }
  }

  // Check questions
  for (const keyword of SMALL_TALK_KEYWORDS.questions) {
    if (message.includes(keyword)) {
      score += 0.3;
      matches++;
      break;
    }
  }

  // Check thanks
  for (const keyword of SMALL_TALK_KEYWORDS.thanks) {
    if (message.includes(keyword)) {
      score += 0.3;
      matches++;
      break;
    }
  }

  // Check goodbyes
  for (const keyword of SMALL_TALK_KEYWORDS.goodbyes) {
    if (message.includes(keyword)) {
      score += 0.3;
      matches++;
      break;
    }
  }

  // Very short messages without numbers are likely small talk
  if (message.length < 15 && !/\d+/.test(message)) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate score for transaction intent
 */
function calculateTransactionScore(message: string): number {
  let score = 0;
  let matches = 0;

  // Check for transaction verbs
  for (const keyword of TRANSACTION_KEYWORDS.verbs) {
    if (message.includes(keyword)) {
      score += 0.25;
      matches++;
      break;
    }
  }

  // Check for money keywords
  for (const keyword of TRANSACTION_KEYWORDS.money) {
    if (message.includes(keyword)) {
      score += 0.3;
      matches++;
      break;
    }
  }

  // Check for category keywords
  for (const keyword of TRANSACTION_KEYWORDS.categories) {
    if (message.includes(keyword)) {
      score += 0.2;
      matches++;
      break;
    }
  }

  // Check for time indicators
  for (const keyword of TRANSACTION_KEYWORDS.time) {
    if (message.includes(keyword)) {
      score += 0.15;
      matches++;
      break;
    }
  }

  // Check for numeric patterns (amounts)
  const hasNumber = /\d+/.test(message);
  if (hasNumber) {
    score += 0.3;
    matches++;
  }

  // Check for currency patterns (50k, 100tr, 1.5 triệu)
  const hasCurrencyPattern = /\d+[k|tr|triệu|nghìn|đồng|vnd]/i.test(message);
  if (hasCurrencyPattern) {
    score += 0.4;
    matches++;
  }

  // Boost if multiple indicators present
  if (matches >= 3) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Generate appropriate response for small talk
 */
export function generateSmallTalkResponse(message: string): string {
  const normalizedMessage = message.toLowerCase().trim();

  // Greetings
  if (SMALL_TALK_KEYWORDS.greetings.some(g => normalizedMessage.includes(g))) {
    return 'Chào bạn! 👋 Mình có thể giúp bạn thêm giao dịch bằng cách nói tự nhiên. Ví dụ: "Ăn phở 50k hôm nay" hoặc "Lương tháng 10 triệu". Hãy thử nhé!';
  }

  // Thanks
  if (SMALL_TALK_KEYWORDS.thanks.some(t => normalizedMessage.includes(t))) {
    return 'Không có gì! 😊 Mình luôn sẵn sàng giúp bạn quản lý tài chính.';
  }

  // Goodbyes
  if (SMALL_TALK_KEYWORDS.goodbyes.some(g => normalizedMessage.includes(g))) {
    return 'Tạm biệt! Hẹn gặp lại bạn! 👋';
  }

  // Questions about capability
  if (normalizedMessage.includes('làm gì') || normalizedMessage.includes('giúp gì')) {
    return 'Mình có thể giúp bạn:\n\n• Thêm giao dịch thu/chi bằng lời nói tự nhiên\n• Hiểu tiếng Việt và các cách nói khác nhau\n• Tự động phân loại và đề xuất hạng mục\n\nHãy thử nói về một giao dịch nhé! Ví dụ: "Đổ xăng 200k"';
  }

  // Default friendly response
  return 'Mình hiểu rồi! Nếu bạn muốn thêm giao dịch, hãy nói tự nhiên như "Ăn cơm 75k" hoặc "Nhận lương 15 triệu" nhé! 😊';
}
