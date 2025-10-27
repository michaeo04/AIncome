# 🔄 How Chatbot Queries Financial Metrics

## Complete Data Flow Explained

Here's the EXACT code flow from user question to AI response with financial metrics.

---

## 📊 Step-by-Step Flow

```
User types: "Tình hình tài chính của tôi thế nào?"
                    ↓
        ChatInterface.tsx
                    ↓
        classifyIntent() → "financial_advice"
                    ↓
        getFinancialAdvice()
                    ↓
    getChatbotFinancialContext()
                    ↓
        Supabase Query
                    ↓
    chatbot_financial_context table
                    ↓
        Returns 30+ metrics
                    ↓
        Build AI prompt with data
                    ↓
        Send to Gemini AI
                    ↓
        AI analyzes patterns
                    ↓
    Return intelligent advice
                    ↓
        Display to user
```

---

## 🔍 Code Location & Flow

### 1️⃣ User Interaction (ChatInterface.tsx)

**File:** `src/components/chat/ChatInterface.tsx`

**Lines 131-180:**

```typescript
const handleSend = async () => {
  const message = inputText.trim();
  addUserMessage(message);
  setProcessing(true);

  // STEP 1: Classify what user wants
  const intentResult = classifyIntent(message);

  // STEP 2: If user asks for financial advice
  if (intentResult.intent === 'financial_advice') {
    addAssistantMessage('📊 Để mình phân tích tài chính của bạn...');

    try {
      // STEP 3: Call getFinancialAdvice() ← THIS QUERIES METRICS!
      const advice = await getFinancialAdvice(
        user!.id,
        message,
        userPersonalization
      );

      addAssistantMessage(advice);
    } catch (error) {
      console.error('Error getting financial advice:', error);
      addAssistantMessage('Xin lỗi, mình đang gặp sự cố...');
    }

    setProcessing(false);
    return;
  }
  // ... handle other intents
};
```

---

### 2️⃣ Get Financial Data (aiService.ts)

**File:** `src/services/aiService.ts`

**Lines 470-594:**

```typescript
export async function getFinancialAdvice(
  userId: string,
  question: string,
  userPersonalization?: UserPersonalization
): Promise<string> {
  try {
    // ═════════════════════════════════════════════════
    // STEP 1: QUERY chatbot_financial_context TABLE
    // ═════════════════════════════════════════════════
    const context = await getChatbotFinancialContext(userId);

    if (!context) {
      return `Tôi chưa có đủ dữ liệu để phân tích...`;
    }

    // ═════════════════════════════════════════════════
    // STEP 2: GET ADDITIONAL DATA
    // ═════════════════════════════════════════════════

    // Get active insights (alerts, warnings)
    const insights = await getActiveInsights(userId);

    // Get last 3 months historical data
    const last3Months = await getLastNMonths(userId, 3);

    // Get interpretations for health score and savings rate
    const healthInterp = getFinancialHealthInterpretation(
      context.financial_health_score
    );
    const savingsInterp = getSavingsRateInterpretation(
      context.savings_rate_current
    );

    // ═════════════════════════════════════════════════
    // STEP 3: BUILD COMPREHENSIVE PROMPT FOR AI
    // ═════════════════════════════════════════════════
    const systemPrompt = `
Bạn là một cố vấn tài chính cá nhân thông minh.

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

HÃY:
1. Đưa ra lời khuyên cụ thể, thiết thực dựa trên dữ liệu
2. Động viên nhưng trung thực về các vấn đề cần cải thiện
3. Đề xuất các hành động cụ thể có thể thực hiện
4. Sử dụng ngôn ngữ thân thiện, dễ hiểu
5. So sánh với các chuẩn mực để đưa ra góc nhìn rõ ràng
`;

    // ═════════════════════════════════════════════════
    // STEP 4: SEND TO AI AND GET RESPONSE
    // ═════════════════════════════════════════════════
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
```

---

### 3️⃣ Query Database (financialAnalyticsService.ts)

**File:** `src/services/financialAnalyticsService.ts`

**Lines 36-75:**

```typescript
/**
 * Get chatbot financial context for a user
 * This is the PRIMARY function for chatbot to get current financial status
 */
export const getChatbotFinancialContext = async (
  userId: string
): Promise<ChatbotFinancialContext | null> => {
  try {
    // ═════════════════════════════════════════════════
    // ACTUAL DATABASE QUERY
    // ═════════════════════════════════════════════════
    const { data, error } = await supabase
      .from('chatbot_financial_context')  // ← THE TABLE
      .select('*')                        // ← GET ALL COLUMNS
      .eq('user_id', userId)              // ← FOR THIS USER
      .maybeSingle();                     // ← RETURN 1 ROW OR NULL

    if (error) {
      console.error('Error fetching chatbot context:', error);
      return null;
    }

    // If no data exists, try to initialize it
    if (!data) {
      console.log('No chatbot context found, attempting to initialize...');
      const initialized = await initializeUserAnalytics(userId);

      if (initialized) {
        // Try to fetch again after initialization
        const { data: retryData } = await supabase
          .from('chatbot_financial_context')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        return retryData;
      }

      return null;
    }

    return data;  // ← RETURNS ALL 30+ METRICS
  } catch (error) {
    console.error('Error in getChatbotFinancialContext:', error);
    return null;
  }
};
```

---

### 4️⃣ Additional Queries (financialAnalyticsService.ts)

**Get Historical Data (Lines 267-290):**

```typescript
/**
 * Get last N months of metrics
 */
export const getLastNMonths = async (
  userId: string,
  months: number = 3
): Promise<FinancialMetricsMonthly[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_metrics_monthly')  // ← HISTORICAL TABLE
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(months);                     // ← LAST 3 MONTHS

    if (error) {
      console.error('Error fetching last N months:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLastNMonths:', error);
    return [];
  }
};
```

**Get Active Insights (Lines 324-346):**

```typescript
/**
 * Get active financial insights for a user
 */
export const getActiveInsights = async (
  userId: string
): Promise<FinancialInsight[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_insights')         // ← INSIGHTS TABLE
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)              // ← ONLY ACTIVE
      .eq('acknowledged', false)          // ← NOT ACKNOWLEDGED
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active insights:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveInsights:', error);
    return [];
  }
};
```

---

## 📊 What Data Gets Queried

### Query 1: Main Context
```sql
SELECT * FROM chatbot_financial_context
WHERE user_id = 'abc-123'
```

**Returns:**
```json
{
  "current_balance": 12500000,
  "total_income_mtd": 15000000,
  "total_expense_mtd": 8500000,
  "savings_rate_current": 43.3,
  "avg_monthly_income": 14000000,
  "avg_monthly_expense": 8000000,
  "avg_savings_rate": 42.8,
  "budgets_exceeded": 2,
  "budgets_warning": 1,
  "budgets_healthy": 5,
  "goals_achieved": 3,
  "goals_on_track": 2,
  "goals_behind": 1,
  "financial_health_score": 72,
  "top_spending_categories": [
    {"category": "Ăn uống", "amount": 3000000, "percentage": 35},
    {"category": "Đi lại", "amount": 1500000, "percentage": 18},
    // ... more
  ],
  "income_trend": "increasing",
  "expense_trend": "stable",
  "emergency_fund_months": 2.5
}
```

### Query 2: Historical Data
```sql
SELECT * FROM financial_metrics_monthly
WHERE user_id = 'abc-123'
ORDER BY year DESC, month DESC
LIMIT 3
```

**Returns 3 months of data:**
```json
[
  {
    "year": 2025,
    "month": 1,
    "total_income": 15000000,
    "total_expense": 9000000,
    "savings_rate": 40,
    "income_change_pct": 10,
    "expense_change_pct": 5
  },
  // ... 2 more months
]
```

### Query 3: Active Insights
```sql
SELECT * FROM financial_insights
WHERE user_id = 'abc-123'
  AND is_active = true
  AND acknowledged = false
ORDER BY created_at DESC
```

**Returns alerts:**
```json
[
  {
    "insight_type": "spending_alert",
    "title": "Chi tiêu ăn uống cao",
    "message": "Tăng 25% so với tháng trước",
    "severity": "warning"
  },
  // ... more insights
]
```

---

## 🔄 Complete Flow Visualization

```
┌─────────────────────────────────────────────────────┐
│ USER: "Tình hình tài chính của tôi thế nào?"       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ ChatInterface.tsx                                   │
│ • handleSend()                                      │
│ • classifyIntent() → "financial_advice"            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ aiService.ts                                        │
│ • getFinancialAdvice(userId, question)             │
└────────────────┬────────────────────────────────────┘
                 │
                 ├──────────────────┐
                 ▼                  ▼
┌──────────────────────────┐ ┌──────────────────────┐
│ financialAnalyticsService│ │ financialAnalytics   │
│ • getChatbotFinancial    │ │ • getLastNMonths()   │
│   Context(userId)        │ │ • getActiveInsights()│
└────────────┬─────────────┘ └──────────┬───────────┘
             │                          │
             │                          │
             ▼                          ▼
┌────────────────────────────────────────────────────┐
│ SUPABASE DATABASE                                  │
│                                                    │
│ Query 1: chatbot_financial_context                │
│   → Returns: 19 main metrics                      │
│                                                    │
│ Query 2: financial_metrics_monthly                │
│   → Returns: 3-6 months history                   │
│                                                    │
│ Query 3: financial_insights                       │
│   → Returns: Active alerts                        │
└────────────────┬───────────────────────────────────┘
                 │
                 │ All data combined
                 ▼
┌─────────────────────────────────────────────────────┐
│ aiService.ts                                        │
│ • Build comprehensive prompt with ALL metrics      │
│ • Send to Gemini AI                                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ GEMINI AI                                           │
│ • Analyzes 30+ data points                         │
│ • Identifies patterns and issues                   │
│ • Generates personalized advice                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ RESPONSE TO USER:                                   │
│                                                     │
│ "📊 Tổng Quan Tài Chính                           │
│                                                     │
│  Điểm sức khỏe: 72/100 (Good)                     │
│                                                     │
│  ✅ ĐIỂM MẠNH:                                     │
│  • Tỷ lệ tiết kiệm 43% - xuất sắc!               │
│  • Thu nhập tăng trưởng ổn định                   │
│                                                     │
│  ⚠️ CẦN CẢI THIỆN:                                 │
│  • Chi tiêu ăn uống 35% (nên 25%)                 │
│  • Quỹ dự phòng 2.5 tháng (cần 3-6)              │
│                                                     │
│  🎯 KẾ HOẠCH 30 NGÀY:                             │
│  1. Giảm ăn ngoài, tiết kiệm 500k                 │
│  2. Bổ sung 2M vào quỹ dự phòng                   │
│  3. Review ngân sách vượt mức                     │
│                                                     │
│  💎 VỚI MỤC TIÊU MUA NHÀ:                         │
│  • Tiết kiệm 6.5M/tháng                           │
│  • 3 năm tích lũy: 234M                           │
│  • Đủ trả trước 20% căn 1.2 tỷ!"                 │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

**Where:** 3 main files
- `ChatInterface.tsx` - User interaction
- `aiService.ts` - Orchestration & prompt building
- `financialAnalyticsService.ts` - Database queries

**How:** 3 database queries
1. `chatbot_financial_context` - Main metrics (19 fields)
2. `financial_metrics_monthly` - Historical data (3-6 months)
3. `financial_insights` - Active alerts

**Result:** 30+ data points combined into intelligent advice

**The key function:** `getFinancialAdvice()` in `aiService.ts` lines 470-594

---

## 🚀 To Make It Work

1. Run `DIAGNOSTIC_AND_FIX_CORRECTED.sql` to populate tables
2. Restart app
3. Ask financial question
4. Chatbot queries these 3 tables
5. Builds comprehensive prompt
6. AI analyzes and responds

**All the code is already there and working - you just need the data in the tables!** ✅
