/**
 * Financial Analytics Service
 *
 * This service provides access to pre-calculated financial metrics and insights
 * for the AI chatbot to use when providing financial advice.
 *
 * Instead of querying raw transaction data, the chatbot queries these analytics
 * tables which provide:
 * - Time-series financial data
 * - Calculated KPIs and ratios
 * - Trend analysis
 * - Pre-generated insights
 *
 * This approach enables the chatbot to:
 * 1. Understand changes over time
 * 2. Provide context-aware advice
 * 3. Respond faster with pre-calculated metrics
 * 4. Identify patterns and anomalies
 */

import { supabase } from './supabase';
import {
  FinancialMetricsDaily,
  FinancialMetricsMonthly,
  FinancialInsight,
  ChatbotFinancialContext,
  LatestFinancialStatus,
  InsightType,
  InsightSeverity,
} from '../types';

/**
 * Get chatbot financial context for a user
 * This is the primary function for chatbot to get current financial status
 */
export const getChatbotFinancialContext = async (
  userId: string
): Promise<ChatbotFinancialContext | null> => {
  try {
    const { data, error } = await supabase
      .from('chatbot_financial_context')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

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

    return data;
  } catch (error) {
    console.error('Error in getChatbotFinancialContext:', error);
    return null;
  }
};

/**
 * Initialize analytics for a user who doesn't have them yet
 * This calls the database function to calculate all metrics
 */
export const initializeUserAnalytics = async (
  userId: string
): Promise<boolean> => {
  try {
    console.log('Initializing analytics for user:', userId);

    // First, try using the database function (if migration 008 was run)
    try {
      const { error } = await supabase.rpc('initialize_user_analytics', {
        p_user_id: userId,
      });

      if (!error) {
        console.log('Database function called successfully');

        // Verify data was actually created
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const { data: verifyData } = await supabase
          .from('chatbot_financial_context')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (verifyData) {
          console.log('Analytics verified - data exists!');
          return true;
        } else {
          console.log('Database function succeeded but no data created, trying fallback...');
        }
      } else {
        console.log('Database function error, trying fallback...', error);
      }
    } catch (rpcError) {
      console.log('RPC function not available, using fallback method');
    }

    // Fallback: Manually trigger calculations by calling the functions directly
    console.log('Using fallback: Manually triggering metric calculations...');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Call calculate_monthly_metrics for current month
    try {
      await supabase.rpc('calculate_monthly_metrics', {
        p_user_id: userId,
        p_year: currentYear,
        p_month: currentMonth,
      });
      console.log('Monthly metrics calculated');
    } catch (err) {
      console.log('Error calculating monthly metrics:', err);
    }

    // Call update_chatbot_context
    try {
      await supabase.rpc('update_chatbot_context', {
        p_user_id: userId,
      });
      console.log('Chatbot context updated');
    } catch (err) {
      console.log('Error updating chatbot context:', err);
    }

    // Wait and verify again
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: finalCheck } = await supabase
      .from('chatbot_financial_context')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (finalCheck) {
      console.log('Fallback successful - analytics created!');
      return true;
    }

    console.log('Fallback failed - analytics still not created');
    return false;
  } catch (error) {
    console.error('Error in initializeUserAnalytics:', error);
    return false;
  }
};

/**
 * Get latest financial status from view
 * Combines monthly metrics with chatbot context
 */
export const getLatestFinancialStatus = async (
  userId: string
): Promise<LatestFinancialStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('v_latest_financial_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching latest status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLatestFinancialStatus:', error);
    return null;
  }
};

/**
 * Get monthly metrics for a specific period
 */
export const getMonthlyMetrics = async (
  userId: string,
  year: number,
  month: number
): Promise<FinancialMetricsMonthly | null> => {
  try {
    const { data, error } = await supabase
      .from('financial_metrics_monthly')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (error) {
      console.error('Error fetching monthly metrics:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getMonthlyMetrics:', error);
    return null;
  }
};

/**
 * Get monthly metrics for a date range
 */
export const getMonthlyMetricsRange = async (
  userId: string,
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<FinancialMetricsMonthly[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_metrics_monthly')
      .select('*')
      .eq('user_id', userId)
      .gte('year', startYear)
      .lte('year', endYear)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching monthly metrics range:', error);
      return [];
    }

    // Filter by month range
    const filtered = (data || []).filter((metric) => {
      const metricDate = metric.year * 12 + metric.month;
      const startDate = startYear * 12 + startMonth;
      const endDate = endYear * 12 + endMonth;
      return metricDate >= startDate && metricDate <= endDate;
    });

    return filtered;
  } catch (error) {
    console.error('Error in getMonthlyMetricsRange:', error);
    return [];
  }
};

/**
 * Get last N months of metrics
 */
export const getLastNMonths = async (
  userId: string,
  months: number = 3
): Promise<FinancialMetricsMonthly[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_metrics_monthly')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(months);

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

/**
 * Get daily metrics for a date range
 */
export const getDailyMetrics = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<FinancialMetricsDaily[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_metrics_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('metric_date', startDate)
      .lte('metric_date', endDate)
      .order('metric_date', { ascending: false });

    if (error) {
      console.error('Error fetching daily metrics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDailyMetrics:', error);
    return [];
  }
};

/**
 * Get active financial insights for a user
 */
export const getActiveInsights = async (
  userId: string
): Promise<FinancialInsight[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('acknowledged', false)
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

/**
 * Get insights by type
 */
export const getInsightsByType = async (
  userId: string,
  insightType: InsightType
): Promise<FinancialInsight[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('insight_type', insightType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching insights by type:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInsightsByType:', error);
    return [];
  }
};

/**
 * Create a new financial insight
 */
export const createInsight = async (
  userId: string,
  insight: {
    insight_type: InsightType;
    title: string;
    message: string;
    severity: InsightSeverity;
    metric_period?: string;
    related_category?: string;
    amount?: number;
    percentage?: number;
    recommendation_text?: string;
    action_required?: boolean;
  }
): Promise<FinancialInsight | null> => {
  try {
    const { data, error } = await supabase
      .from('financial_insights')
      .insert({
        user_id: userId,
        ...insight,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating insight:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createInsight:', error);
    return null;
  }
};

/**
 * Acknowledge an insight
 */
export const acknowledgeInsight = async (
  insightId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('financial_insights')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', insightId);

    if (error) {
      console.error('Error acknowledging insight:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in acknowledgeInsight:', error);
    return false;
  }
};

/**
 * Deactivate an insight
 */
export const deactivateInsight = async (insightId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('financial_insights')
      .update({
        is_active: false,
      })
      .eq('id', insightId);

    if (error) {
      console.error('Error deactivating insight:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deactivateInsight:', error);
    return false;
  }
};

/**
 * Manually trigger metric calculation for current month
 */
export const refreshCurrentMonthMetrics = async (
  userId: string
): Promise<boolean> => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { error } = await supabase.rpc('calculate_monthly_metrics', {
      p_user_id: userId,
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error('Error refreshing monthly metrics:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in refreshCurrentMonthMetrics:', error);
    return false;
  }
};

/**
 * Manually trigger chatbot context update
 */
export const refreshChatbotContext = async (
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('update_chatbot_context', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error refreshing chatbot context:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in refreshChatbotContext:', error);
    return false;
  }
};

/**
 * Get financial health interpretation
 */
export const getFinancialHealthInterpretation = (
  score: number
): {
  level: string;
  color: string;
  description: string;
} => {
  if (score >= 80) {
    return {
      level: 'Excellent',
      color: '#10B981',
      description: 'Your financial health is excellent! Keep up the great work.',
    };
  } else if (score >= 60) {
    return {
      level: 'Good',
      color: '#3B82F6',
      description: 'Your financial health is good. There are some areas for improvement.',
    };
  } else if (score >= 40) {
    return {
      level: 'Fair',
      color: '#F59E0B',
      description: 'Your financial health is fair. Consider reviewing your spending and savings habits.',
    };
  } else {
    return {
      level: 'Needs Improvement',
      color: '#EF4444',
      description: 'Your financial health needs attention. Let\'s work on improving it together.',
    };
  }
};

/**
 * Get savings rate interpretation
 */
export const getSavingsRateInterpretation = (
  rate: number
): {
  level: string;
  color: string;
  description: string;
} => {
  if (rate >= 20) {
    return {
      level: 'Excellent',
      color: '#10B981',
      description: 'You\'re saving at an excellent rate! This is above the recommended 20%.',
    };
  } else if (rate >= 15) {
    return {
      level: 'Good',
      color: '#3B82F6',
      description: 'Good savings rate. You\'re on track with the 15% recommendation.',
    };
  } else if (rate >= 10) {
    return {
      level: 'Fair',
      color: '#F59E0B',
      description: 'Fair savings rate. Try to increase to at least 15% if possible.',
    };
  } else if (rate >= 0) {
    return {
      level: 'Low',
      color: '#EF4444',
      description: 'Your savings rate is low. Aim for at least 10-15% of your income.',
    };
  } else {
    return {
      level: 'Negative',
      color: '#DC2626',
      description: 'You\'re spending more than you earn. This needs immediate attention.',
    };
  }
};

/**
 * Generate financial summary for chatbot
 */
export const generateFinancialSummary = async (
  userId: string
): Promise<string> => {
  try {
    const context = await getChatbotFinancialContext(userId);
    if (!context) {
      return 'I don\'t have enough financial data yet to provide a summary. Start by adding some transactions!';
    }

    const healthInterp = getFinancialHealthInterpretation(
      context.financial_health_score
    );
    const savingsInterp = getSavingsRateInterpretation(
      context.savings_rate_current
    );

    let summary = `📊 **Your Financial Summary**\n\n`;
    summary += `**Financial Health Score:** ${context.financial_health_score}/100 (${healthInterp.level})\n`;
    summary += `${healthInterp.description}\n\n`;

    summary += `**Current Balance:** ${context.current_balance.toLocaleString()} VND\n`;
    summary += `**This Month:** ${context.total_income_mtd.toLocaleString()} income, ${context.total_expense_mtd.toLocaleString()} expenses\n`;
    summary += `**Savings Rate:** ${context.savings_rate_current.toFixed(1)}% (${savingsInterp.level})\n\n`;

    if (context.budgets_exceeded > 0) {
      summary += `⚠️ **Alert:** ${context.budgets_exceeded} budget(s) exceeded\n`;
    }

    if (context.emergency_fund_months < 3) {
      summary += `💡 **Recommendation:** Build your emergency fund to cover 3-6 months of expenses\n`;
    }

    if (context.top_spending_categories.length > 0) {
      const topCategory = context.top_spending_categories[0];
      summary += `\n**Top Spending:** ${topCategory.category} (${topCategory.percentage.toFixed(1)}%)\n`;
    }

    return summary;
  } catch (error) {
    console.error('Error generating financial summary:', error);
    return 'Unable to generate financial summary at this time.';
  }
};
