# 🔥 FIX YOUR ACCOUNT NOW - 5 Minutes

## Your Error:
```
Error fetching chatbot context: Cannot coerce the result to a single JSON object
```

## What's Wrong:
Your account has transactions but NO analytics data. The system can't give financial advice without analytics.

---

## ✅ SOLUTION (Choose One)

### **OPTION A: Automatic Fix** ⭐ RECOMMENDED

1. **Open Supabase** → SQL Editor
2. **Copy ALL content** from: `supabase/QUICK_FIX_YOUR_ACCOUNT.sql`
3. **Paste into SQL Editor**
4. **Click "Run"**
5. **Look at STEP 7** output:
   - If you see your balance, income, expenses → **SUCCESS!** ✅
   - If "0 rows" → Try Option B

### **OPTION B: Manual Fix** (If Option A fails)

Run these commands **ONE BY ONE** in SQL Editor:

```sql
-- 1. Check if functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%chatbot%';
```

**If you see 0 rows returned:**
- ❌ Migration 007 wasn't run properly
- **Fix:** Run migration 007 first, then migration 008

**If you see `update_chatbot_context`:**
- ✅ Functions exist
- Continue to step 2:

```sql
-- 2. Manually create your analytics
INSERT INTO chatbot_financial_context (
  user_id,
  current_balance,
  total_income_mtd,
  total_expense_mtd,
  savings_rate_current,
  avg_monthly_income,
  avg_monthly_expense,
  avg_savings_rate,
  budgets_exceeded,
  budgets_warning,
  budgets_healthy,
  financial_health_score,
  top_spending_categories,
  income_trend,
  expense_trend,
  emergency_fund_months
)
SELECT
  auth.uid(),
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0),
  COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0),
  CASE WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0
    THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) -
           SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) /
          SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100)
    ELSE 0 END,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
  0,
  0, 0, 0,
  50,
  '[]'::jsonb,
  'unknown', 'unknown',
  0
FROM transactions
WHERE user_id = auth.uid()
ON CONFLICT (user_id) DO UPDATE SET
  current_balance = EXCLUDED.current_balance,
  total_income_mtd = EXCLUDED.total_income_mtd,
  total_expense_mtd = EXCLUDED.total_expense_mtd,
  last_updated = NOW();
```

```sql
-- 3. Verify it worked
SELECT
  current_balance,
  total_income_mtd,
  total_expense_mtd,
  financial_health_score
FROM chatbot_financial_context
WHERE user_id = auth.uid();
```

**Expected:** You should see your actual balance and income/expense values!

---

## 🧪 Test in App

After running either option:

1. **Close and restart the app**
2. **Go to chatbot**
3. **Click the 💡 button** (bottom left)
4. **Click "📊 Tình hình tài chính"**
5. **You should get financial analysis!** ✅

---

## 🔍 If Still Not Working

### Check 1: Did migration 007 run?

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'chatbot_financial_context';
```

**Expected:** Should return `chatbot_financial_context`

**If empty:**
- ❌ Table doesn't exist
- **Fix:** Run migration 007 first!

### Check 2: Do you have transactions?

```sql
SELECT COUNT(*) FROM transactions WHERE user_id = auth.uid();
```

**Expected:** Should be > 0

**If 0:**
- You have no transactions yet
- Add a transaction first: "Ăn phở 50k"

### Check 3: Does your context exist now?

```sql
SELECT * FROM chatbot_financial_context WHERE user_id = auth.uid();
```

**Expected:** Should return 1 row with your data

**If 0 rows:**
- Run Option B above

---

## 📋 What Each Migration Does

### Migration 007 (Original Analytics):
- Creates analytics tables
- Creates calculation functions
- **YOU MUST RUN THIS FIRST!**

### Migration 008 (Fix for Existing Users):
- Adds error handling
- Auto-initializes old accounts
- **RUN AFTER 007**

---

## ⚡ FASTEST FIX (30 seconds)

**Just copy-paste this into SQL Editor and run:**

```sql
-- Quick fix for your account
INSERT INTO chatbot_financial_context (user_id, current_balance, total_income_mtd, total_expense_mtd, savings_rate_current, avg_monthly_income, avg_monthly_expense, avg_savings_rate, budgets_exceeded, budgets_warning, budgets_healthy, financial_health_score, top_spending_categories, income_trend, expense_trend, emergency_fund_months)
SELECT auth.uid(), COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0), COALESCE(SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0), CASE WHEN SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) > 0 THEN ((SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END)) / SUM(CASE WHEN type = 'income' AND DATE(date) >= DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END) * 100) ELSE 0 END, COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0), 0, 0, 0, 0, 50, '[]'::jsonb, 'unknown', 'unknown', 0 FROM transactions WHERE user_id = auth.uid() ON CONFLICT (user_id) DO UPDATE SET current_balance = EXCLUDED.current_balance, total_income_mtd = EXCLUDED.total_income_mtd, total_expense_mtd = EXCLUDED.total_expense_mtd, last_updated = NOW();

-- Verify
SELECT 'SUCCESS!' as status, current_balance, total_income_mtd, total_expense_mtd FROM chatbot_financial_context WHERE user_id = auth.uid();
```

**Then restart app and test!**

---

## 🎯 Summary

| Problem | Solution | Time |
|---------|----------|------|
| No analytics data | Run QUICK_FIX_YOUR_ACCOUNT.sql | 2 min |
| Functions missing | Run migration 007 first | 1 min |
| Still failing | Use fastest fix above | 30 sec |

---

## ✅ Success Criteria

After the fix, you should:
- ✅ See 💡 button in chatbot
- ✅ Tap 💡 → Quick actions appear
- ✅ Click "📊 Tình hình tài chính"
- ✅ Get detailed financial analysis
- ✅ Add transactions without errors

**Your account will be fixed in under 5 minutes!** 🚀
