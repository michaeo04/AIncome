# AI Chatbot Financial Advisor - Implementation Guide

## Overview

This guide explains how to integrate the financial analytics system with your AI chatbot to transform it from a simple transaction recorder into an intelligent financial advisor.

## Architecture

### The Problem with Direct Database Queries

When a chatbot queries raw transaction data directly, it has several limitations:
- ❌ Cannot understand trends over time
- ❌ Cannot provide context about financial health
- ❌ Slow queries for aggregations
- ❌ No pre-calculated insights
- ❌ Difficult to identify patterns

### The Solution: Analytics Layer

Instead, we use a **dedicated analytics layer** that:
- ✅ Pre-calculates financial metrics daily and monthly
- ✅ Stores time-series data for trend analysis
- ✅ Maintains a chatbot context table for fast queries
- ✅ Generates insights automatically
- ✅ Updates in real-time via database triggers

## Database Tables

### 1. `chatbot_financial_context`
**Purpose:** Single source of truth for current financial status

**What it contains:**
- Current balance
- Month-to-date income and expenses
- 3-month averages
- Budget status (exceeded, warning, healthy)
- Goal status
- **Financial health score (0-100)**
- Top spending categories
- Trends (increasing/stable/decreasing)
- Emergency fund months

**When to use:**
- For general "how am I doing?" questions
- When chatbot needs current financial overview
- For quick status checks

**Example queries:**
```typescript
import { getChatbotFinancialContext } from '../services/financialAnalyticsService';

// Get current financial status
const context = await getChatbotFinancialContext(userId);

console.log(`Financial Health Score: ${context.financial_health_score}/100`);
console.log(`Current Balance: ${context.current_balance}`);
console.log(`Savings Rate: ${context.savings_rate_current}%`);
console.log(`Emergency Fund: ${context.emergency_fund_months} months`);
console.log(`Income Trend: ${context.income_trend}`);
```

### 2. `financial_metrics_monthly`
**Purpose:** Monthly aggregated metrics with KPIs

**What it contains:**
- Income, expense, savings totals
- Savings rate percentage
- Budget adherence rate
- Category breakdowns (as JSON)
- Top expense/income categories
- **Month-over-month change percentages**
- Transaction counts

**When to use:**
- For month-to-month comparisons
- For "how did I do last month?" questions
- For trend analysis over multiple months
- For budget performance reviews

**Example queries:**
```typescript
import { getLastNMonths, getMonthlyMetrics } from '../services/financialAnalyticsService';

// Get last 3 months for trend analysis
const last3Months = await getLastNMonths(userId, 3);

// Analyze trend
last3Months.forEach(month => {
  console.log(`${month.year}-${month.month}:`);
  console.log(`  Income: ${month.total_income} (${month.income_change_percent}% change)`);
  console.log(`  Savings Rate: ${month.savings_rate}%`);
  console.log(`  Top Expense: ${month.top_expense_category} - ${month.top_expense_amount}`);
});
```

### 3. `financial_metrics_daily`
**Purpose:** Daily snapshots for granular analysis

**What it contains:**
- Daily income/expense totals
- Net savings per day
- Running balance
- Category breakdowns
- Transaction counts

**When to use:**
- For weekly spending analysis
- For identifying specific high-spending days
- For detailed time-period questions

### 4. `financial_insights`
**Purpose:** Pre-generated insights and recommendations

**What it contains:**
- Insight type (spending_alert, budget_warning, etc.)
- Title and message
- Severity level
- Related metrics
- Actionable recommendations

**When to use:**
- To proactively notify users of important events
- To surface insights without user asking
- To provide context in conversations

**Example queries:**
```typescript
import { getActiveInsights, createInsight } from '../services/financialAnalyticsService';

// Get active insights
const insights = await getActiveInsights(userId);

// Create a new insight
await createInsight(userId, {
  insight_type: 'spending_alert',
  title: 'High Spending Detected',
  message: 'Your dining expenses this month are 50% higher than average',
  severity: 'warning',
  related_category: 'Dining',
  percentage: 50,
  recommendation_text: 'Consider cooking at home more often to reduce expenses'
});
```

## Key Financial Metrics Explained

### Financial Health Score (0-100)

**How it's calculated:**
- Positive balance: 20 points
- Savings rate (20% target): 25 points
- Budget adherence: 20 points
- Emergency fund (6 months target): 25 points
- Positive trends: 10 points

**Interpretation:**
- 80-100: Excellent 🟢
- 60-79: Good 🔵
- 40-59: Fair 🟡
- 0-39: Needs Improvement 🔴

### Savings Rate

**Formula:** `(Net Savings / Total Income) × 100`

**Benchmarks:**
- 20%+: Excellent
- 15-19%: Good
- 10-14%: Fair
- 0-9%: Low
- Negative: Spending more than earning ⚠️

### Budget Adherence Rate

**Formula:** `(Budgets On Track / Total Budgets) × 100`

**Categories:**
- Healthy: < 80% of budget used
- Warning: 80-100% of budget used
- Exceeded: > 100% of budget used

### Emergency Fund Ratio

**Formula:** `Current Balance / Average Monthly Expense`

**Benchmarks:**
- 6+ months: Excellent
- 3-6 months: Good
- 1-3 months: Fair
- < 1 month: Needs attention

## Chatbot Integration Patterns

### Pattern 1: Financial Health Check

**User asks:** "How am I doing financially?"

**Chatbot should:**
1. Query `chatbot_financial_context`
2. Interpret financial health score
3. Highlight strengths and areas for improvement

```typescript
const context = await getChatbotFinancialContext(userId);
const healthInterp = getFinancialHealthInterpretation(context.financial_health_score);

const response = `
Your financial health score is ${context.financial_health_score}/100 - ${healthInterp.level}!

📊 Current Status:
• Balance: ${context.current_balance.toLocaleString()} VND
• Savings Rate: ${context.savings_rate_current}%
• Emergency Fund: ${context.emergency_fund_months.toFixed(1)} months

${context.income_trend === 'increasing' ? '✅ Your income is trending up!' : ''}
${context.budgets_exceeded > 0 ? `⚠️ ${context.budgets_exceeded} budgets exceeded` : ''}
`;
```

### Pattern 2: Spending Analysis

**User asks:** "Where is my money going?"

**Chatbot should:**
1. Query `chatbot_financial_context` for top spending categories
2. Query `financial_metrics_monthly` for category breakdown
3. Compare to previous months

```typescript
const context = await getChatbotFinancialContext(userId);
const thisMonth = await getMonthlyMetrics(userId, currentYear, currentMonth);

const topSpending = context.top_spending_categories.slice(0, 5);

const response = `
Your top spending categories this month:

${topSpending.map((cat, i) =>
  `${i+1}. ${cat.category}: ${cat.amount.toLocaleString()} VND (${cat.percentage}%)`
).join('\n')}

${thisMonth.expense_change_percent > 10 ?
  `⚠️ Your expenses are ${thisMonth.expense_change_percent}% higher than last month` :
  '✅ Your spending is stable compared to last month'}
`;
```

### Pattern 3: Budget Performance

**User asks:** "How are my budgets doing?"

**Chatbot should:**
1. Query `chatbot_financial_context` for budget summary
2. Get specific budget details if needed
3. Provide recommendations

```typescript
const context = await getChatbotFinancialContext(userId);

const response = `
Budget Status:
• ${context.budgets_healthy} budgets healthy ✅
• ${context.budgets_warning} budgets in warning zone ⚠️
• ${context.budgets_exceeded} budgets exceeded 🔴

Overall adherence rate: ${context.budget_adherence_rate}%

${context.budgets_exceeded > 0 ?
  'Tip: Review exceeded budgets and adjust spending or limits.' :
  'Great job staying within your budgets!'}
`;
```

### Pattern 4: Trend Analysis

**User asks:** "How has my spending changed?"

**Chatbot should:**
1. Query `getLastNMonths` for historical data
2. Calculate trends and patterns
3. Identify significant changes

```typescript
const last3Months = await getLastNMonths(userId, 3);

const avgExpense = last3Months.reduce((sum, m) => sum + m.total_expense, 0) / 3;
const latestExpense = last3Months[0].total_expense;
const change = ((latestExpense - avgExpense) / avgExpense * 100).toFixed(1);

const response = `
Spending Trend (Last 3 Months):

${last3Months.map(m =>
  `${m.year}-${m.month}: ${m.total_expense.toLocaleString()} VND (${m.savings_rate}% saved)`
).join('\n')}

${change > 0 ?
  `Your spending is ${change}% above your 3-month average` :
  `You're doing great! Spending is ${Math.abs(change)}% below average`}
`;
```

### Pattern 5: Savings Goals

**User asks:** "Can I afford to save more?"

**Chatbot should:**
1. Query current savings rate
2. Check budget status
3. Analyze discretionary spending
4. Provide personalized recommendations

```typescript
const context = await getChatbotFinancialContext(userId);
const thisMonth = await getMonthlyMetrics(userId, currentYear, currentMonth);

const discretionarySpending = thisMonth.expense_by_category['Dining'] +
                               thisMonth.expense_by_category['Entertainment'];

const potentialSavings = discretionarySpending * 0.3; // 30% reduction

const response = `
Current Savings Analysis:

• Current savings rate: ${context.savings_rate_current}%
• Recommended target: 15-20%

${context.savings_rate_current < 15 ? `
Opportunities to save more:
• Reduce discretionary spending by 30%: +${potentialSavings.toLocaleString()} VND/month
• Review subscriptions and recurring expenses
• Set up automatic savings transfers
` : 'You\'re already saving at a great rate!'}
`;
```

## Best Practices for Chatbot Implementation

### 1. Always Use Analytics Tables, Not Raw Transactions

```typescript
// ❌ BAD: Querying raw transactions
const transactions = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId);
// Then doing calculations in JavaScript...

// ✅ GOOD: Using pre-calculated metrics
const context = await getChatbotFinancialContext(userId);
// Already has all the metrics you need!
```

### 2. Provide Context, Not Just Numbers

```typescript
// ❌ BAD: Just stating numbers
"Your balance is 5,000,000 VND"

// ✅ GOOD: Providing context and interpretation
"Your balance is 5,000,000 VND, which covers 2.5 months of expenses.
Financial experts recommend 3-6 months. Consider building your emergency fund."
```

### 3. Use Trends for Better Advice

```typescript
// ❌ BAD: Only looking at current month
const thisMonth = await getMonthlyMetrics(userId, year, month);

// ✅ GOOD: Comparing multiple months
const last3Months = await getLastNMonths(userId, 3);
// Now you can see if it's a pattern or anomaly
```

### 4. Personalize Based on User Context

```typescript
// Get user personalization from profiles table
const profile = await supabase
  .from('profiles')
  .select('financial_goals, financial_knowledge, age_range')
  .eq('id', userId)
  .single();

// Adjust advice based on:
// - financial_knowledge: beginner needs simpler explanations
// - financial_goals: save_house → focus on high savings rate
// - age_range: younger users can take more risk
```

### 5. Proactive Insights

```typescript
// Don't wait for users to ask - generate insights automatically

const context = await getChatbotFinancialContext(userId);

// Check for concerning patterns
if (context.savings_rate_current < 0) {
  await createInsight(userId, {
    insight_type: 'spending_alert',
    title: 'Negative Savings This Month',
    message: 'You\'re spending more than you\'re earning this month',
    severity: 'critical',
    recommendation_text: 'Review your expenses and identify areas to cut back'
  });
}

if (context.emergency_fund_months < 1) {
  await createInsight(userId, {
    insight_type: 'recommendation',
    title: 'Build Your Emergency Fund',
    message: 'Your emergency fund is low. Aim for 3-6 months of expenses',
    severity: 'warning',
    recommendation_text: 'Start by saving 10% of your income each month'
  });
}
```

## Sample Chatbot Prompts

### System Prompt for Financial Advisor Mode

```
You are a personal financial advisor chatbot for AIncome app. Your role is to:

1. Provide personalized financial advice based on the user's actual data
2. Help users understand their spending patterns and financial health
3. Offer actionable recommendations to improve their financial situation
4. Be encouraging but honest about areas needing improvement

You have access to:
- chatbot_financial_context: Current financial status, health score, trends
- financial_metrics_monthly: Historical monthly data for trends
- financial_insights: Pre-generated insights about the user's finances

Guidelines:
- Always use the analytics tables, never query raw transactions
- Provide context and interpretation, not just numbers
- Compare current performance to benchmarks (savings rate target: 15-20%)
- Use trends to provide better advice
- Be conversational and supportive
- Offer specific, actionable recommendations

Financial Health Score Interpretation:
- 80-100: Excellent - Praise their efforts, suggest optimization
- 60-79: Good - Acknowledge progress, identify improvement areas
- 40-59: Fair - Provide concrete steps to improve
- 0-39: Needs Improvement - Be supportive, create action plan

Savings Rate Benchmarks:
- 20%+: Excellent
- 15-19%: Good (recommended minimum)
- 10-14%: Fair
- <10%: Low

Emergency Fund Target: 3-6 months of expenses
```

### Example Conversation Flow

**User:** "How am I doing financially?"

**Chatbot queries:** `getChatbotFinancialContext(userId)`

**Chatbot:**
```
Great question! Let me analyze your current financial health.

📊 Financial Health Score: 72/100 (Good)

Your finances are in good shape! Here's the breakdown:

✅ Strengths:
• Current balance: 12,500,000 VND
• Savings rate: 18% (above the 15% recommended)
• Income is trending upward (+12% vs last month)

⚠️ Areas to improve:
• Emergency fund: 2.3 months (aim for 3-6 months)
• 1 budget exceeded this month (Dining)

💡 Quick wins:
• Build your emergency fund to 3 months (needs ~5,000,000 more VND)
• Review your dining expenses - they're 45% above your budget

Would you like specific advice on any of these areas?
```

## Integration Checklist

- [ ] Run migration `007_financial_analytics_system.sql` in Supabase
- [ ] Import types from `src/types/index.ts`
- [ ] Use `financialAnalyticsService.ts` for all chatbot queries
- [ ] Update AI service to query analytics tables
- [ ] Add financial advice intent to chatbot
- [ ] Test with sample data
- [ ] Set up automatic insight generation (optional)
- [ ] Add UI to display insights (optional)

## Performance Considerations

### Automatic Updates
- Metrics update automatically when transactions are added/updated/deleted
- Chatbot context refreshes on every transaction change
- No manual refresh needed in most cases

### Manual Refresh (if needed)
```typescript
import { refreshChatbotContext } from '../services/financialAnalyticsService';

// Force refresh if needed
await refreshChatbotContext(userId);
```

### Query Performance
- All queries use indexed columns
- Chatbot context table is optimized for fast reads (1 row per user)
- Monthly metrics queries are limited to recent months
- Views are pre-computed for common queries

## Future Enhancements

Consider implementing:
1. **Anomaly Detection:** Automatically detect unusual spending patterns
2. **Predictive Analytics:** Forecast future expenses based on trends
3. **Goal Recommendations:** Suggest realistic savings goals
4. **Comparison Analytics:** Compare user to similar demographic (anonymized)
5. **Seasonal Patterns:** Identify and account for seasonal spending changes
6. **Smart Budgets:** Auto-adjust budgets based on spending patterns

## Support

For questions or issues:
1. Check the migration file for database schema details
2. Review TypeScript types in `src/types/index.ts`
3. Examine service functions in `src/services/financialAnalyticsService.ts`
4. Test queries in Supabase SQL editor

---

**Remember:** The goal is to transform the chatbot from a passive recorder to an active financial advisor that provides meaningful, personalized insights based on the user's actual financial data and trends.
