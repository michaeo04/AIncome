# Database Schema Reference
**Last Updated:** 2025-12-13
**Schema Version:** Post-Migration 015 (Optimized)

This document describes the **current, optimized** database schema after cleanup migration 015.

---

## Table of Contents
1. [Core Tables](#core-tables)
2. [Analytics Tables](#analytics-tables)
3. [Database Functions (RPCs)](#database-functions-rpcs)
4. [Views](#views)
5. [Triggers](#triggers)
6. [Storage Buckets](#storage-buckets)
7. [Indexes](#indexes)
8. [Best Practices](#best-practices)

---

## Core Tables

### `profiles`
**Purpose:** User account settings, preferences, and personalization

**Columns:**
| Column | Type | Description | Used By |
|--------|------|-------------|---------|
| `id` | UUID | Primary key (references auth.users) | All modules |
| `email` | TEXT | User email address | Auth |
| `name` | TEXT | User display name | UI display |
| `avatar_url` | TEXT | Path to profile picture | Settings |
| `currency` | TEXT | Preferred currency (VND, USD, etc.) | All financial displays |
| `language` | TEXT | App language preference | i18n (future) |
| `theme` | TEXT | UI theme (light/dark/auto) | Theme system |
| `notifications_enabled` | BOOLEAN | Master notification toggle | Settings |
| `budget_alerts` | BOOLEAN | Budget threshold alerts | Budget module |
| `goal_reminders` | BOOLEAN | Saving goal reminders | Goals module |
| `financial_goals` | JSONB | User's financial objectives | AI advisor |
| `financial_knowledge` | TEXT | Knowledge level (beginner/intermediate/advanced) | AI advisor |
| `communication_style` | TEXT | Preferred AI communication style | AI advisor |
| `age_range` | TEXT | User age bracket | AI advisor |
| `financial_concerns` | JSONB | Primary financial worries | AI advisor |
| `income_level` | TEXT | General income bracket | AI advisor |
| `family_situation` | TEXT | Family/living situation | AI advisor |
| `has_completed_personalization` | BOOLEAN | Completed personalization quiz | Onboarding |
| `has_completed_onboarding` | BOOLEAN | Completed initial setup | Onboarding |
| `created_at` | TIMESTAMPTZ | Account creation time | System |
| `updated_at` | TIMESTAMPTZ | Last profile update | System |

**RLS Policies:**
- Users can only view/update their own profile
- Auto-created on signup via trigger

**Indexes:**
- `profiles_email_idx` on `email`
- `profiles_personalization_completed_idx` on `has_completed_personalization`
- `profiles_onboarding_completed_idx` on `has_completed_onboarding`

---

### `categories`
**Purpose:** Income/expense categories with custom icons

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (NULL = default category) |
| `name` | TEXT | Category name |
| `type` | TEXT | 'income' or 'expense' |
| `icon` | TEXT | Emoji icon |
| `color` | TEXT | Hex color code |
| `is_default` | BOOLEAN | System-provided category |
| `icon_url` | TEXT | Custom uploaded icon path |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS Policies:**
- Users see their own categories + default categories (user_id IS NULL)
- Users can only create/update/delete their own categories
- Cannot delete default categories

**Indexes:**
- `categories_user_id_idx` on `user_id`
- `categories_type_idx` on `type`
- `categories_user_type_idx` on `(user_id, type)`

**Constraints:**
- UNIQUE `(user_id, name, type)` - No duplicate names per type
- CHECK `name != ''` - Name required

---

### `transactions`
**Purpose:** All income and expense records

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (references auth.users) |
| `type` | TEXT | 'income' or 'expense' |
| `amount` | DECIMAL(15,2) | Transaction amount |
| `category_id` | UUID | Category reference |
| `note` | TEXT | Transaction description |
| `date` | DATE | Transaction date |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS Policies:**
- Users can only view/create/update/delete their own transactions

**Indexes:**
- `transactions_user_id_idx` on `user_id`
- `transactions_date_idx` on `date DESC`
- `transactions_category_id_idx` on `category_id`
- `transactions_user_date_idx` on `(user_id, date DESC)`
- `transactions_user_type_idx` on `(user_id, type)`
- `transactions_user_type_date_idx` on `(user_id, type, date DESC)` ✨ **New in 015**

**Constraints:**
- CHECK `type IN ('income', 'expense')`
- CHECK `amount > 0`
- FOREIGN KEY to `categories` ON DELETE RESTRICT (prevents deleting used categories)

**Triggers:**
- `update_transactions_updated_at` - Auto-update timestamp
- `transaction_analytics_trigger` - Update financial analytics on change

---

### `budgets`
**Purpose:** Budget limits by category with alert thresholds

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `category_id` | UUID | Category to budget |
| `amount` | DECIMAL(15,2) | Budget limit amount |
| `period` | TEXT | 'month', 'quarter', or 'year' |
| `start_date` | DATE | Period start |
| `end_date` | DATE | Period end |
| `alert_threshold` | INTEGER | Alert at % (e.g., 80) |
| `icon_url` | TEXT | Custom budget icon |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS Policies:**
- Users can only manage their own budgets

**Indexes:**
- `budgets_user_id_idx` on `user_id`
- `budgets_category_id_idx` on `category_id`
- `budgets_dates_idx` on `(start_date, end_date)`
- `budgets_user_period_dates_idx` on `(user_id, period, start_date, end_date)` ✨ **New in 015**

**Constraints:**
- CHECK `period IN ('month', 'quarter', 'year')`
- CHECK `amount > 0` ✨ **New in 015**
- CHECK `alert_threshold >= 0 AND alert_threshold <= 100`
- CHECK `end_date > start_date`
- UNIQUE `(user_id, category_id, period, start_date)` - One budget per category per period

---

### `saving_goals`
**Purpose:** Savings targets with allocation tracking

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | TEXT | Goal name |
| `target_amount` | DECIMAL(15,2) | Target savings amount |
| `allocated_amount` | DECIMAL(15,2) | Currently allocated to goal |
| `start_date` | DATE | Goal start date |
| `target_date` | DATE | Goal deadline |
| `icon` | TEXT | Emoji icon |
| `color` | TEXT | Hex color code |
| `note` | TEXT | Goal description |
| `status` | TEXT | 'active', 'completed', 'archived' |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS Policies:**
- Users can only manage their own goals

**Indexes:**
- `saving_goals_user_id_idx` on `user_id`
- `saving_goals_status_idx` on `status`
- `saving_goals_dates_idx` on `(start_date, target_date)`

**Constraints:**
- CHECK `name != ''`
- CHECK `target_amount > 0`
- CHECK `allocated_amount >= 0`
- CHECK `target_date > start_date`
- CHECK `target_date <= start_date + INTERVAL '50 years'` ✨ **New in 015** (realistic dates)
- CHECK `status IN ('active', 'completed', 'archived')`

**Triggers:**
- `trigger_check_goal_completion` - Auto-complete when allocated >= target

---

### `goal_allocations`
**Purpose:** Track money transfers between available balance and goals

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `goal_id` | UUID | Associated goal |
| `amount` | DECIMAL(15,2) | Amount (+deposit, -withdrawal) |
| `type` | TEXT | 'deposit' or 'withdrawal' |
| `note` | TEXT | Optional note |
| `created_at` | TIMESTAMPTZ | Transaction time |

**RLS Policies:**
- Users can view their own allocations
- Insert/delete via RPC functions only

**Indexes:**
- `goal_allocations_user_id_idx` on `user_id`
- `goal_allocations_goal_id_idx` on `goal_id`
- `goal_allocations_created_at_idx` on `created_at DESC`

**Constraints:**
- CHECK `amount != 0`
- CHECK `(type = 'deposit' AND amount > 0) OR (type = 'withdrawal' AND amount < 0)`

**Note:** Operations use RPC functions (`allocate_to_goal`, `withdraw_from_goal`) for validation

---

### `pending_transactions`
**Purpose:** Bank transaction notifications awaiting user confirmation

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `raw_sms_text` | TEXT | Original bank SMS |
| `bank_name` | TEXT | Bank identifier |
| `parsed_type` | TEXT | AI-detected type |
| `parsed_amount` | DECIMAL(15,2) | AI-detected amount |
| `parsed_category_id` | UUID | AI-suggested category |
| `parsed_note` | TEXT | Extracted description |
| `parsed_date` | DATE | Transaction date |
| `parsed_merchant` | TEXT | Merchant name |
| `confidence` | DECIMAL(3,2) | AI confidence (0.0-1.0) |
| `status` | TEXT | 'pending', 'confirmed', 'rejected' |
| `created_at` | TIMESTAMPTZ | Received time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS Policies:**
- Users can view/update/delete their own pending transactions
- Service role can insert (webhook access)

**Realtime:** Subscribed to all changes (INSERT, UPDATE, DELETE)

**Indexes:**
- `pending_transactions_user_id_idx` on `user_id`
- `pending_transactions_status_idx` on `status`
- `pending_transactions_created_idx` on `created_at DESC`
- `pending_transactions_user_status_idx` on `(user_id, status, created_at DESC)`

---

## Analytics Tables

### `chatbot_financial_context`
**Purpose:** Pre-calculated financial data for AI advisor

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (UNIQUE) |
| `current_balance` | DECIMAL(15,2) | Net balance |
| `total_income_mtd` | DECIMAL(15,2) | Month-to-date income |
| `total_expense_mtd` | DECIMAL(15,2) | Month-to-date expense |
| `savings_rate_current` | DECIMAL(5,2) | Current month savings % |
| `avg_monthly_income` | DECIMAL(15,2) | 3-month average income |
| `avg_monthly_expense` | DECIMAL(15,2) | 3-month average expense |
| `avg_savings_rate` | DECIMAL(5,2) | Average savings rate |
| `budgets_exceeded` | INTEGER | Budgets over limit |
| `budgets_warning` | INTEGER | Budgets 80-100% |
| `budgets_healthy` | INTEGER | Budgets <80% |
| `goals_achieved` | INTEGER | Completed goals |
| `goals_on_track` | INTEGER | Goals on schedule |
| `goals_behind` | INTEGER | Goals behind schedule |
| `financial_health_score` | INTEGER | Score 0-100 |
| `top_spending_categories` | JSONB | Top 5 spending categories |
| `income_trend` | TEXT | 'increasing', 'stable', 'decreasing' |
| `expense_trend` | TEXT | 'increasing', 'stable', 'decreasing' |
| `emergency_fund_months` | DECIMAL(4,2) | Months of expenses saved |
| `last_updated` | TIMESTAMPTZ | Last calculation time |
| `created_at` | TIMESTAMPTZ | Creation time |

**RLS Policies:**
- Users can only view their own context

**Updated By:** `update_user_analytics()` RPC function (called by transaction trigger)

---

### `financial_metrics_monthly`
**Purpose:** Aggregated monthly financial statistics

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `year` | INTEGER | Year |
| `month` | INTEGER | Month (1-12) |
| `total_income` | DECIMAL(15,2) | Month income |
| `total_expense` | DECIMAL(15,2) | Month expense |
| `net_savings` | DECIMAL(15,2) | Income - Expense |
| `savings_rate` | DECIMAL(5,2) | Savings % |
| `budget_adherence_rate` | DECIMAL(5,2) | Budgets on track % |
| `budgets_on_track` | INTEGER | Count on track |
| `budgets_over_limit` | INTEGER | Count exceeded |
| `total_budgets` | INTEGER | Total budgets |
| `active_goals_count` | INTEGER | Active goals |
| `goals_on_track` | INTEGER | Goals on schedule |
| `goals_behind` | INTEGER | Goals behind |
| `month_start_balance` | DECIMAL(15,2) | Balance at month start |
| `month_end_balance` | DECIMAL(15,2) | Balance at month end |
| `income_transaction_count` | INTEGER | Income count |
| `expense_transaction_count` | INTEGER | Expense count |
| `income_by_category` | JSONB | Category breakdown |
| `expense_by_category` | JSONB | Category breakdown |
| `top_expense_category` | TEXT | Highest expense category |
| `top_expense_amount` | DECIMAL(15,2) | Highest category amount |
| `top_income_category` | TEXT | Highest income category |
| `top_income_amount` | DECIMAL(15,2) | Highest category amount |
| `income_change_percent` | DECIMAL(5,2) | Change from prev month |
| `expense_change_percent` | DECIMAL(5,2) | Change from prev month |
| `savings_change_percent` | DECIMAL(5,2) | Change from prev month |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Constraints:**
- UNIQUE `(user_id, year, month)`

**Updated By:** `update_user_analytics()` RPC function

---

### `financial_metrics_daily`
**Purpose:** Daily financial snapshots

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `metric_date` | DATE | Date |
| `total_income` | DECIMAL(15,2) | Day income |
| `total_expense` | DECIMAL(15,2) | Day expense |
| `net_savings` | DECIMAL(15,2) | Day net |
| `running_balance` | DECIMAL(15,2) | Balance up to date |
| `income_transaction_count` | INTEGER | Income count |
| `expense_transaction_count` | INTEGER | Expense count |
| `income_by_category` | JSONB | Category breakdown |
| `expense_by_category` | JSONB | Category breakdown |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Constraints:**
- UNIQUE `(user_id, metric_date)`

**Updated By:** `update_user_analytics()` RPC function

---

### `financial_insights`
**Purpose:** AI-generated financial alerts and recommendations

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `insight_type` | TEXT | Type classification |
| `title` | TEXT | Insight title |
| `message` | TEXT | Insight description |
| `severity` | TEXT | 'info', 'warning', 'critical', 'success' |
| `metric_period` | TEXT | Related period |
| `related_category` | TEXT | Related category |
| `amount` | DECIMAL(15,2) | Related amount |
| `percentage` | DECIMAL(5,2) | Related percentage |
| `recommendation_text` | TEXT | Action suggestion |
| `action_required` | BOOLEAN | Requires user action |
| `is_active` | BOOLEAN | Currently relevant |
| `acknowledged` | BOOLEAN | User has seen |
| `acknowledged_at` | TIMESTAMPTZ | Acknowledged time |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Indexes:**
- `financial_insights_user_id_idx` on `user_id`
- `financial_insights_active_idx` on `(user_id, is_active, created_at DESC)`
- `financial_insights_user_active_idx` on `(user_id, is_active, created_at DESC) WHERE is_active = true` ✨ **New in 015** (partial index)
- `financial_insights_type_idx` on `(user_id, insight_type)`

**Constraints:**
- CHECK `insight_type IN ('spending_alert', 'savings_achievement', 'budget_warning', 'goal_progress', 'trend_positive', 'trend_negative', 'recommendation', 'milestone', 'anomaly')`
- CHECK `severity IN ('info', 'warning', 'critical', 'success')`

---

## Database Functions (RPCs)

### Goal Allocation Functions

#### `get_available_balance(p_user_id UUID)`
**Returns:**
```sql
TABLE (
  net_balance DECIMAL(15,2),
  allocated_balance DECIMAL(15,2),
  available_balance DECIMAL(15,2)
)
```
**Purpose:** Calculate user's available balance for new allocations
**Formula:** `Available = Net - Allocated`
**Used By:** Goal allocation UI, allocation validation

#### `can_allocate_to_goal(p_user_id UUID, p_goal_id UUID, p_amount DECIMAL)`
**Returns:** `BOOLEAN`
**Purpose:** Validate if user can allocate/withdraw specified amount
**Used By:** Allocation form validation

#### `allocate_to_goal(p_user_id UUID, p_goal_id UUID, p_amount DECIMAL, p_note TEXT)`
**Returns:** `JSON`
```json
{
  "success": true,
  "allocation_id": "uuid",
  "new_allocated_amount": 1000.00
}
```
**Purpose:** Transfer money from available balance to goal
**Side Effects:** Creates goal_allocation record, updates goal.allocated_amount

#### `withdraw_from_goal(p_user_id UUID, p_goal_id UUID, p_amount DECIMAL, p_note TEXT)`
**Returns:** `JSON`
**Purpose:** Transfer money from goal back to available balance
**Side Effects:** Creates goal_allocation record, updates goal.allocated_amount

---

### Analytics Functions

#### `update_user_analytics(p_user_id UUID)`
**Returns:** `void`
**Purpose:** Recalculate all analytics for user
**Updates:**
- `chatbot_financial_context` (user context)
- `financial_metrics_monthly` (all months with transactions)
- `financial_metrics_daily` (all dates with transactions)

**Called By:** Transaction trigger (automatic)

#### `initialize_user_analytics(p_user_id UUID)`
**Returns:** `void`
**Purpose:** Initialize analytics for new user
**Called By:** Backend (manual initialization)

#### `refresh_my_analytics()`
**Returns:** `TEXT`
**Purpose:** Manually refresh analytics for current user
**Used By:** Frontend (manual refresh button)

#### `update_chatbot_context(p_user_id UUID)`
**Returns:** `void`
**Purpose:** Update only chatbot context (fast)
**Used By:** AI advisor before generating advice

#### `calculate_monthly_metrics(p_user_id UUID, p_year INTEGER, p_month INTEGER)`
**Returns:** `void`
**Purpose:** Recalculate specific month metrics
**Used By:** Backend (targeted updates)

---

### Diagnostic Functions (Manual Use Only)

These functions are kept for troubleshooting via SQL editor:

#### `check_user_analytics(p_user_id UUID)`
**Returns:** `TABLE(metric TEXT, count BIGINT, status TEXT)`
**Purpose:** Verify analytics data exists for user

#### `fix_user_analytics(p_user_id UUID)`
**Returns:** `TEXT`
**Purpose:** Fix broken analytics for user

#### `recalculate_user_analytics(p_user_id UUID)`
**Returns:** `void`
**Purpose:** Delete and rebuild all analytics

---

## Views

### `goal_progress_view`
**Purpose:** Goals with calculated progress percentages

**Columns:**
- All columns from `saving_goals`
- `progress_percent` - (allocated_amount / target_amount) * 100
- `remaining_amount` - target_amount - allocated_amount
- `is_completed` - allocated_amount >= target_amount
- `days_remaining` - Days until target_date

**Used By:** Goal screens, goal allocation service

### `v_latest_financial_status`
**Purpose:** Latest monthly status per user

**Columns:**
- Latest month from `financial_metrics_monthly`
- Joined with `chatbot_financial_context` for health score

**Used By:** Analysis screens, financial dashboard

---

## Triggers

### `on_auth_user_created`
**Table:** `auth.users`
**Function:** `handle_new_user()`
**Purpose:** Auto-create profile on signup
**Action:** INSERT into `profiles`

### `update_*_updated_at`
**Tables:** All tables with `updated_at` column
**Function:** `update_updated_at_column()`
**Purpose:** Auto-update timestamp on row changes

### `transaction_analytics_trigger`
**Table:** `transactions`
**Function:** `on_transaction_change()`
**Purpose:** Auto-update analytics when transactions change
**Action:** Calls `update_user_analytics(user_id)`

### `trigger_check_goal_completion`
**Table:** `saving_goals`
**Function:** `check_goal_completion()`
**Purpose:** Auto-complete goal when allocated >= target

---

## Storage Buckets

### `icons` (Public)
**Purpose:** User-uploaded custom category/budget icons
**RLS Policies:**
- Users can upload to their own folder `/{user_id}/`
- Anyone can view (public bucket)
- Users can update/delete their own icons

### `avatars` (Public) - **Not Currently Used**
**Purpose:** User profile pictures (defined but not implemented)
**Status:** Ready for future implementation

---

## Indexes

### High-Impact Indexes (Most Used)
```sql
-- Transactions (most queried table)
transactions_user_type_date_idx (user_id, type, date DESC)  -- ✨ New in 015

-- Budgets
budgets_user_period_dates_idx (user_id, period, start_date, end_date)  -- ✨ New in 015

-- Financial Insights
financial_insights_user_active_idx (user_id, is_active, created_at DESC) WHERE is_active = true  -- ✨ New in 015
```

### Standard Indexes (All Tables)
- Primary key indexes (automatic)
- Foreign key indexes on `user_id`, `category_id`, `goal_id`
- Date indexes on `created_at`, `date`, `start_date`, `end_date`

---

## Best Practices

### Adding New Features

1. **Check existing tables first** - Don't create new tables if existing ones can be extended
2. **Add columns carefully** - Only add columns that will be actively used
3. **Create indexes for common queries** - Profile queries before adding indexes
4. **Use RPC functions for complex logic** - Keep business logic in database for consistency
5. **Enable RLS on all tables** - Security first!

### Performance Optimization

1. **Use composite indexes** - For queries with multiple WHERE conditions
2. **Use partial indexes** - For filtered queries (e.g., `WHERE status = 'active'`)
3. **Limit SELECT \*** - Only select columns you need
4. **Use Realtime sparingly** - Only subscribe to channels you actively need
5. **Analyze query plans** - Use `EXPLAIN ANALYZE` to check performance

### Migration Guidelines

1. **Never modify old migrations** - They've already run in production
2. **Create new migration for changes** - Add new numbered migration file
3. **Test migrations locally first** - Use Supabase CLI local development
4. **Make migrations idempotent** - Use `IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT`
5. **Add rollback notes** - Document how to undo changes if needed

### Cleanup Guidelines

1. **Review usage every 3-6 months** - Remove unused columns/functions
2. **Check function calls** - Use query logs to find unused RPCs
3. **Optimize indexes** - Remove duplicate or unused indexes
4. **Run VACUUM ANALYZE** - Update statistics for query planner
5. **Monitor storage size** - Archive old analytics data if needed

---

## Changelog

### Migration 015 (2025-12-13) - Schema Cleanup
**Removed:**
- 5 unused database functions
- 3 unused profile columns (date_format, week_start, month_start)
- 2 unused views (user_balance, v_spending_patterns)
- 1+ duplicate indexes

**Added:**
- 3 composite indexes for common queries
- 2 data validation constraints
- Improved query performance

**Result:** Leaner, faster, more maintainable schema

---

## Getting Help

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Project CLAUDE.md:** Full codebase context and architecture
- **Migration Files:** `supabase/migrations/` - Source of truth for schema

---

**Schema Status:** ✅ Production-Ready, Optimized
**Last Cleanup:** Migration 015 (2025-12-13)
**Next Review:** 2025-06-13 (6 months)
