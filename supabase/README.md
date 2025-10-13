# Supabase Setup Guide

This folder contains database migrations and setup scripts for the Personal Finance Tracker app.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project

## Setup Steps

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - Name: `personal-finance-tracker`
   - Database Password: Choose a strong password
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 2. Get Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)
3. Update your `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Migrations

You have two options to run the database migrations:

#### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to SQL Editor in your Supabase Dashboard
2. Copy the content of each migration file in order:
   - `001_initial_schema.sql` - Create all tables, RLS policies, triggers, and functions
   - `002_seed_default_categories.sql` - Seed default categories
   - `003_setup_storage.sql` - Setup storage buckets
3. Paste and run each script

#### Option B: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

### 4. Verify Setup

1. Go to Table Editor in Supabase Dashboard
2. You should see these tables:
   - `profiles`
   - `categories` (with 17 default categories)
   - `transactions`
   - `budgets`
   - `saving_goals`

3. Go to Storage in Supabase Dashboard
4. You should see these buckets:
   - `avatars` (public)
   - `backups` (private)

### 5. Test Authentication

1. Go to Authentication in Supabase Dashboard
2. Enable Email authentication if not already enabled
3. (Optional) Configure other auth providers (Google, Apple)

## Database Schema

### Tables

- **profiles** - User profiles and settings
- **categories** - Income and expense categories (default + custom)
- **transactions** - All financial transactions
- **budgets** - Budget limits by category
- **saving_goals** - Savings targets

### Views

- **user_balance** - Calculates current balance for each user

### Functions

- **get_goal_progress(goal_id)** - Calculate saving goal progress
- **get_budget_spending(budget_id)** - Calculate budget spending

## Row Level Security (RLS)

All tables have RLS enabled. Users can only:
- View their own data
- Create/update/delete their own data
- View default categories (user_id = NULL)

## Troubleshooting

### Migration errors

If you encounter errors:
1. Check that you're running migrations in order
2. Verify you have the correct permissions
3. Check Supabase logs in the Dashboard

### Authentication issues

1. Verify your `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are correct
2. Check that email authentication is enabled in Supabase Dashboard
3. Check the auth logs in Supabase Dashboard

### RLS Policy errors

If users can't access their data:
1. Verify RLS policies are created correctly
2. Check that the user is authenticated
3. Test policies in the Supabase SQL Editor

## Next Steps

After completing the setup:
1. Update `.env` file with your credentials
2. Run the app: `npm start`
3. Create a test account in the app
4. Verify data is being saved in Supabase
