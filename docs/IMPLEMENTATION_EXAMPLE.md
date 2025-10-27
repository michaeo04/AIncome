# Implementation Example: Upgrading Chatbot to Financial Advisor

This document shows practical examples of how to integrate the financial analytics system into your existing chatbot.

## Step 1: Update aiService.ts

Add financial advice capabilities to your existing AI service:

```typescript
// src/services/aiService.ts

import {
  getChatbotFinancialContext,
  getLastNMonths,
  generateFinancialSummary,
  getActiveInsights,
} from './financialAnalyticsService';

// Add new intent type
export type ChatIntent =
  | 'small_talk'
  | 'create_transaction'
  | 'financial_advice'  // NEW
  | 'unknown';

// Classify user intent
export const classifyIntent = async (
  message: string
): Promise<IntentClassificationResult> => {
  const lowerMessage = message.toLowerCase();

  // Financial advice keywords
  const adviceKeywords = [
    'how am i doing',
    'financial health',
    'spending',
    'saving',
    'budget',
    'advice',
    'recommend',
    'should i',
    'can i afford',
    'my money',
    'analysis',
    'report',
    'summary',
    'trend',
    'compare',
  ];

  if (adviceKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return { intent: 'financial_advice', confidence: 0.9 };
  }

  // ... existing transaction and small_talk logic
};

// Handle financial advice intent
export const getFinancialAdvice = async (
  userId: string,
  question: string
): Promise<string> => {
  try {
    // Get user's financial context
    const context = await getChatbotFinancialContext(userId);
    if (!context) {
      return "I don't have enough data yet. Start adding transactions so I can provide personalized advice!";
    }

    // Get recent insights
    const insights = await getActiveInsights(userId);

    // Build context for AI
    const systemPrompt = `
You are a personal financial advisor. The user has the following financial status:

Current Balance: ${context.current_balance} VND
Monthly Income (MTD): ${context.total_income_mtd} VND
Monthly Expenses (MTD): ${context.total_expense_mtd} VND
Savings Rate: ${context.savings_rate_current}%
Financial Health Score: ${context.financial_health_score}/100

3-Month Averages:
- Average Income: ${context.avg_monthly_income} VND
- Average Expenses: ${context.avg_monthly_expense} VND
- Average Savings Rate: ${context.avg_savings_rate}%

Budget Status:
- Budgets Exceeded: ${context.budgets_exceeded}
- Budgets in Warning: ${context.budgets_warning}
- Budgets Healthy: ${context.budgets_healthy}

Trends:
- Income Trend: ${context.income_trend}
- Expense Trend: ${context.expense_trend}

Emergency Fund: ${context.emergency_fund_months} months of expenses

Top Spending Categories:
${context.top_spending_categories.map(cat =>
  `- ${cat.category}: ${cat.amount} VND (${cat.percentage}%)`
).join('\n')}

Active Insights:
${insights.map(insight =>
  `- ${insight.title}: ${insight.message}`
).join('\n')}

Benchmarks to consider:
- Recommended savings rate: 15-20%
- Emergency fund target: 3-6 months
- Budget adherence: 100% or better

Provide specific, actionable advice based on this data. Be encouraging but honest.
`;

    // Call your AI API (OpenAI, Anthropic, etc.)
    const response = await callAIAPI(systemPrompt, question);

    return response;
  } catch (error) {
    console.error('Error getting financial advice:', error);
    return "I'm having trouble analyzing your finances right now. Please try again later.";
  }
};
```

## Step 2: Update Chat Screen

Modify your chat screen to handle the new financial advice intent:

```typescript
// src/screens/ChatScreen.tsx

import { classifyIntent, getFinancialAdvice } from '../services/aiService';

const handleSendMessage = async () => {
  if (!inputText.trim()) return;

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputText,
    timestamp: new Date(),
  };

  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setIsProcessing(true);

  try {
    // Classify intent
    const { intent } = await classifyIntent(inputText);

    let assistantResponse = '';

    if (intent === 'financial_advice') {
      // NEW: Handle financial advice
      assistantResponse = await getFinancialAdvice(user!.id, inputText);
    } else if (intent === 'create_transaction') {
      // Existing transaction logic
      assistantResponse = await handleTransactionCreation(inputText);
    } else {
      // Small talk or unknown
      assistantResponse = await getSmallTalkResponse(inputText);
    }

    const assistantMessage: ChatMessage = {
      id: Date.now().toString() + '_ai',
      role: 'assistant',
      content: assistantResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
  } catch (error) {
    console.error('Error processing message:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

## Step 3: Add Quick Action Buttons

Add preset financial advice questions for better UX:

```typescript
// src/screens/ChatScreen.tsx

const QuickActions = () => {
  const quickQuestions = [
    { icon: '📊', text: 'How am I doing?', query: 'How is my financial health?' },
    { icon: '💰', text: 'Spending analysis', query: 'Where is my money going?' },
    { icon: '🎯', text: 'Savings tips', query: 'How can I save more money?' },
    { icon: '📈', text: 'Monthly report', query: 'Show me my monthly financial summary' },
  ];

  return (
    <View style={styles.quickActions}>
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {quickQuestions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionButton}
            onPress={() => {
              setInputText(action.query);
              handleSendMessage();
            }}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={styles.quickActionText}>{action.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
```

## Step 4: Create Financial Insights Component (Optional)

Display active insights in the UI:

```typescript
// src/components/FinancialInsightsWidget.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getActiveInsights, acknowledgeInsight } from '../services/financialAnalyticsService';
import { FinancialInsight } from '../types';

export const FinancialInsightsWidget: React.FC<{ userId: string }> = ({ userId }) => {
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    const data = await getActiveInsights(userId);
    setInsights(data);
  };

  const handleDismiss = async (insightId: string) => {
    await acknowledgeInsight(insightId);
    setInsights(prev => prev.filter(i => i.id !== insightId));
  };

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Financial Insights</Text>
      {insights.map(insight => (
        <View
          key={insight.id}
          style={[
            styles.insightCard,
            { borderLeftColor: getSeverityColor(insight.severity) }
          ]}
        >
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>
              {getInsightIcon(insight.insight_type)}
            </Text>
            <Text style={styles.insightTitle}>{insight.title}</Text>
          </View>
          <Text style={styles.insightMessage}>{insight.message}</Text>
          {insight.recommendation_text && (
            <Text style={styles.insightRecommendation}>
              💡 {insight.recommendation_text}
            </Text>
          )}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => handleDismiss(insight.id)}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return '#EF4444';
    case 'warning': return '#F59E0B';
    case 'success': return '#10B981';
    default: return '#3B82F6';
  }
};

const getInsightIcon = (type: string) => {
  const icons = {
    spending_alert: '⚠️',
    savings_achievement: '🎉',
    budget_warning: '📊',
    goal_progress: '🎯',
    trend_positive: '📈',
    trend_negative: '📉',
    recommendation: '💡',
    milestone: '🏆',
    anomaly: '🔍',
  };
  return icons[type] || '💡';
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1F2937',
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  insightMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  insightRecommendation: {
    fontSize: 14,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dismissButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dismissText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
```

## Step 5: Add to Home Screen

Integrate insights widget into your home screen:

```typescript
// src/screens/HomeScreen.tsx

import { FinancialInsightsWidget } from '../components/FinancialInsightsWidget';

const HomeScreen = () => {
  const { user } = useAuthStore();

  return (
    <ScrollView>
      {/* Existing balance card, etc. */}

      {/* NEW: Financial Insights */}
      <FinancialInsightsWidget userId={user!.id} />

      {/* Existing recent transactions, etc. */}
    </ScrollView>
  );
};
```

## Step 6: Test the System

### Test Queries to Try:

1. **General Health:**
   - "How am I doing financially?"
   - "Give me a financial summary"
   - "What's my financial health score?"

2. **Spending Analysis:**
   - "Where is my money going?"
   - "What am I spending the most on?"
   - "Show me my top expenses"

3. **Trends:**
   - "How has my spending changed?"
   - "Am I saving more than last month?"
   - "Show me my income trend"

4. **Budgets:**
   - "How are my budgets doing?"
   - "Which budgets am I over?"
   - "Am I on track with my budget?"

5. **Advice:**
   - "How can I save more money?"
   - "Should I cut back on spending?"
   - "What's your recommendation for me?"

### Expected Behavior:

The chatbot should:
- ✅ Respond with specific data from analytics tables
- ✅ Provide context and interpretation
- ✅ Compare to benchmarks
- ✅ Offer actionable recommendations
- ✅ Be personalized to user's situation

## Troubleshooting

### Issue: "I don't have enough data"

**Cause:** User hasn't added transactions yet, or metrics haven't calculated

**Solution:**
```typescript
// Manually trigger metric calculation
import { refreshChatbotContext } from '../services/financialAnalyticsService';

await refreshChatbotContext(userId);
```

### Issue: Metrics not updating

**Cause:** Database triggers may not be working

**Solution:**
1. Check Supabase logs for errors
2. Verify migration ran successfully
3. Test trigger manually in SQL editor:
```sql
SELECT calculate_monthly_metrics(
  'user-id-here'::uuid,
  2025,
  10
);
```

### Issue: Slow queries

**Cause:** Missing indexes or large dataset

**Solution:**
1. Verify indexes exist:
```sql
\d financial_metrics_monthly
```
2. Limit queries to recent data:
```typescript
const recentMonths = await getLastNMonths(userId, 6); // Only last 6 months
```

## Performance Tips

1. **Cache context in memory:**
```typescript
let cachedContext: ChatbotFinancialContext | null = null;
let cacheTime: number = 0;

const getCachedContext = async (userId: string) => {
  const now = Date.now();
  if (cachedContext && (now - cacheTime) < 60000) { // 1 minute cache
    return cachedContext;
  }

  cachedContext = await getChatbotFinancialContext(userId);
  cacheTime = now;
  return cachedContext;
};
```

2. **Batch queries when possible:**
```typescript
// Instead of multiple queries
const context = await getChatbotFinancialContext(userId);
const insights = await getActiveInsights(userId);
const months = await getLastNMonths(userId, 3);

// Do in parallel
const [context, insights, months] = await Promise.all([
  getChatbotFinancialContext(userId),
  getActiveInsights(userId),
  getLastNMonths(userId, 3),
]);
```

3. **Only fetch what you need:**
```typescript
// Instead of querying all fields
.select('*')

// Select specific fields
.select('financial_health_score, current_balance, savings_rate_current')
```

## Next Steps

1. ✅ Run the migration
2. ✅ Test with sample data
3. ✅ Update AI service
4. ✅ Add financial advice intent
5. ✅ Test conversation flows
6. ⏳ Add insights widget (optional)
7. ⏳ Implement proactive notifications (optional)
8. ⏳ Create analytics dashboard (optional)

---

**You're now ready to transform your chatbot into an intelligent financial advisor!** 🎉
