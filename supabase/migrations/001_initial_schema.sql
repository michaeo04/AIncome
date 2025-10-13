-- ========================================
-- PERSONAL FINANCE TRACKER - INITIAL SCHEMA
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. CREATE UTILITY FUNCTIONS
-- ========================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 2. CREATE PROFILES TABLE
-- ========================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'VND' NOT NULL,
  language TEXT DEFAULT 'vi' NOT NULL,
  theme TEXT DEFAULT 'light' NOT NULL, -- light, dark, auto
  date_format TEXT DEFAULT 'DD/MM/YYYY' NOT NULL,
  week_start INTEGER DEFAULT 1 NOT NULL, -- 0: Sunday, 1: Monday
  month_start INTEGER DEFAULT 1 NOT NULL, -- 1-31
  notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Indexes
CREATE INDEX profiles_email_idx ON public.profiles(email);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 3. CREATE CATEGORIES TABLE
-- ========================================

CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(user_id, name, type), -- No duplicate names within same type for a user
  CHECK (name != '')
);

-- RLS Policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL); -- NULL = default categories

CREATE POLICY "Users can create own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

-- Indexes
CREATE INDEX categories_user_id_idx ON public.categories(user_id);
CREATE INDEX categories_type_idx ON public.categories(type);
CREATE INDEX categories_user_type_idx ON public.categories(user_id, type);

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. CREATE TRANSACTIONS TABLE
-- ========================================

CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX transactions_date_idx ON public.transactions(date DESC);
CREATE INDEX transactions_category_id_idx ON public.transactions(category_id);
CREATE INDEX transactions_user_date_idx ON public.transactions(user_id, date DESC);
CREATE INDEX transactions_user_type_idx ON public.transactions(user_id, type);

-- Trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. CREATE BUDGETS TABLE
-- ========================================

CREATE TABLE public.budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  period TEXT NOT NULL DEFAULT 'month' CHECK (period IN ('month', 'quarter', 'year')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  alert_threshold INTEGER DEFAULT 80 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CHECK (end_date > start_date),
  UNIQUE(user_id, category_id, period, start_date) -- 1 budget per category per period
);

-- RLS Policies for budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX budgets_user_id_idx ON public.budgets(user_id);
CREATE INDEX budgets_category_id_idx ON public.budgets(category_id);
CREATE INDEX budgets_dates_idx ON public.budgets(start_date, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. CREATE SAVING_GOALS TABLE
-- ========================================

CREATE TABLE public.saving_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (name != ''),
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  start_date DATE NOT NULL,
  target_date DATE NOT NULL CHECK (target_date > start_date),
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#10B981',
  note TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policies for saving_goals
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.saving_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON public.saving_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.saving_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.saving_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX saving_goals_user_id_idx ON public.saving_goals(user_id);
CREATE INDEX saving_goals_status_idx ON public.saving_goals(status);
CREATE INDEX saving_goals_dates_idx ON public.saving_goals(start_date, target_date);

-- Trigger for updated_at
CREATE TRIGGER update_saving_goals_updated_at
  BEFORE UPDATE ON public.saving_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. CREATE VIEWS
-- ========================================

-- View: User Balance
CREATE OR REPLACE VIEW public.user_balance AS
SELECT
  user_id,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
FROM public.transactions
GROUP BY user_id;

-- ========================================
-- 8. CREATE FUNCTIONS
-- ========================================

-- Function: Get Goal Progress
CREATE OR REPLACE FUNCTION public.get_goal_progress(goal_id UUID)
RETURNS TABLE (
  goal_id UUID,
  goal_name TEXT,
  target_amount DECIMAL,
  current_amount DECIMAL,
  progress_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sg.id as goal_id,
    sg.name as goal_name,
    sg.target_amount,
    COALESCE(
      (SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
       FROM public.transactions t
       WHERE t.user_id = sg.user_id
       AND t.date >= sg.start_date
       AND t.date <= CURRENT_DATE),
      0
    ) as current_amount,
    ROUND(
      (COALESCE(
        (SELECT SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END)
         FROM public.transactions t
         WHERE t.user_id = sg.user_id
         AND t.date >= sg.start_date
         AND t.date <= CURRENT_DATE),
        0
      ) / sg.target_amount) * 100,
      2
    ) as progress_percent
  FROM public.saving_goals sg
  WHERE sg.id = goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get Budget Spending
CREATE OR REPLACE FUNCTION public.get_budget_spending(budget_id UUID)
RETURNS TABLE (
  budget_id UUID,
  budget_amount DECIMAL,
  spent_amount DECIMAL,
  remaining_amount DECIMAL,
  usage_percent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as budget_id,
    b.amount as budget_amount,
    COALESCE(
      (SELECT SUM(t.amount)
       FROM public.transactions t
       WHERE t.user_id = b.user_id
       AND t.category_id = b.category_id
       AND t.type = 'expense'
       AND t.date >= b.start_date
       AND t.date <= b.end_date),
      0
    ) as spent_amount,
    b.amount - COALESCE(
      (SELECT SUM(t.amount)
       FROM public.transactions t
       WHERE t.user_id = b.user_id
       AND t.category_id = b.category_id
       AND t.type = 'expense'
       AND t.date >= b.start_date
       AND t.date <= b.end_date),
      0
    ) as remaining_amount,
    ROUND(
      (COALESCE(
        (SELECT SUM(t.amount)
         FROM public.transactions t
         WHERE t.user_id = b.user_id
         AND t.category_id = b.category_id
         AND t.type = 'expense'
         AND t.date >= b.start_date
         AND t.date <= b.end_date),
        0
      ) / b.amount) * 100,
      2
    ) as usage_percent
  FROM public.budgets b
  WHERE b.id = budget_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
