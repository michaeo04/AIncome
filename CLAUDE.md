# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Personal Finance Tracker** - A mobile expense tracking application built with Expo (React Native) and Supabase backend.

**Key Features:**
- Transaction management (income/expense tracking)
- Budget management with alerts
- Saving goals with progress tracking
- Analysis and reports with charts
- Multi-currency support
- Dark mode support

## Tech Stack

- **Frontend**: Expo (React Native) + TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **UI Library**: React Native Paper
- **Charts**: React Native Chart Kit
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Date Handling**: date-fns

## Development Commands

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios

# Run on Web
npm run web

# Type checking
npx tsc --noEmit

# Clear cache
npx expo start --clear
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── common/      # Common components (Button, Card, etc.)
│   ├── transactions/
│   ├── budget/
│   ├── goals/
│   ├── analysis/
│   └── charts/
├── screens/         # Screen components
│   ├── auth/        # Login, Signup
│   ├── onboarding/  # Welcome screens
│   ├── home/        # Home & Transactions
│   ├── budget/      # Budget management
│   ├── analysis/    # Charts & reports
│   ├── profile/     # Settings & profile
│   ├── categories/  # Category management
│   ├── goals/       # Saving goals
│   └── transactions/
├── navigation/      # Navigation setup
├── stores/          # Zustand stores
├── services/        # API services (Supabase client)
├── hooks/           # Custom React hooks
├── utils/           # Helper functions
├── types/           # TypeScript types
├── constants/       # App constants
└── theme/           # Theme configuration

supabase/
└── migrations/      # Database migration scripts
    ├── 001_initial_schema.sql
    ├── 002_seed_default_categories.sql
    └── 003_setup_storage.sql
```

## Architecture

### Data Flow
1. **Screens** consume data from **Zustand stores**
2. **Stores** interact with **Supabase** via **services**
3. **Supabase** handles authentication, database, and storage
4. **RLS policies** ensure data security (users only see their own data)

### Key Patterns
- **Atomic State Management**: Each module has its own Zustand store
- **RLS Security**: All database queries filtered by authenticated user
- **Type Safety**: Full TypeScript coverage
- **Component Reusability**: Shared components in `components/common`

## Database Schema

### Core Tables
- `profiles` - User settings and preferences
- `categories` - Income/expense categories (default + custom)
- `transactions` - All income/expense records
- `budgets` - Budget limits by category with periods
- `saving_goals` - Savings targets with progress tracking

### Key Relationships
- Transactions → Categories (many-to-one)
- Budgets → Categories (many-to-one)
- All tables → Users (via RLS policies)

### Important Functions
- `get_goal_progress(goal_id)` - Calculate saving goal progress
- `get_budget_spending(budget_id)` - Calculate budget usage
- `user_balance` view - Real-time net balance calculation

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run migrations in `supabase/migrations/` (in order)
3. Copy credentials to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```
4. See `supabase/README.md` for detailed setup

## Development Workflow

### Adding a New Feature
1. Create types in `src/types/`
2. Create Zustand store in `src/stores/`
3. Create screen components in `src/screens/`
4. Create reusable components in `src/components/`
5. Add navigation routes if needed
6. Update database schema if needed (new migration)

### Working with Supabase
- Client initialized in `src/services/supabase.ts`
- Always use RLS-protected queries
- Use TypeScript types from `src/types/`
- Handle auth state in `authStore.ts`

### State Management Pattern
```typescript
// stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  data: any[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export const useExampleStore = create<ExampleState>((set) => ({
  data: [],
  isLoading: false,
  fetchData: async () => {
    set({ isLoading: true });
    // Fetch from Supabase
    set({ data: result, isLoading: false });
  },
}));
```

## Key Modules

### Module 1: Authentication
- Login/Signup with Supabase Auth
- Auto profile creation via database trigger
- Session persistence with AsyncStorage

### Module 2: Onboarding
- Welcome screens for first-time users
- Initial setup (currency, categories, budget)
- Onboarding completion tracking

### Module 3: Transactions
- Add/Edit/Delete transactions
- Category selection
- Date grouping and filtering
- Net Balance calculation

### Module 4: Budget Management
- Create budgets by category
- Progress tracking with color-coded alerts
- Budget period support (month/quarter/year)
- Alert thresholds (70%, 80%, 90%, 100%)

### Module 5: Saving Goals
- Goal creation with target amounts and dates
- Progress tracking based on Net Balance
- Monthly saving rate analysis
- Completion celebration

### Module 6: Analysis & Reports
- Income vs Expense charts
- Category breakdown pie charts
- Spending trends
- Time period filtering

### Module 7: Profile & Settings
- User profile management
- Avatar upload to Supabase Storage
- App settings (currency, language, theme)
- Security settings

## Important Notes

- **Net Balance Formula**: `Total Income - Total Expense`
- **Goal Progress**: Calculated from Net Balance since goal start date
- **Budget Alerts**: Triggered when adding expenses that exceed thresholds
- **Default Categories**: 17 categories (5 income, 12 expense) seeded for all users
- **RLS Security**: All queries automatically filtered by authenticated user

## Common Tasks

### Add a new screen
1. Create in `src/screens/[module]/NewScreen.tsx`
2. Add route to navigation in `src/navigation/[Module]Navigator.tsx`
3. Add types to `src/navigation/types.ts`

### Add a new store
1. Create in `src/stores/newStore.ts`
2. Import and use in components with `useNewStore()`

### Add a database table
1. Create migration in `supabase/migrations/00X_description.sql`
2. Add types to `src/types/index.ts`
3. Enable RLS and add policies
4. Run migration in Supabase Dashboard

## Troubleshooting

- **Navigation errors**: Ensure all screens are registered in navigators
- **Type errors**: Check `src/types/` for interface definitions
- **Supabase errors**: Verify `.env` credentials and RLS policies
- **Build errors**: Clear cache with `npx expo start --clear`

## Next Development Phases

See `docs/Product Requirement Document.txt` for complete feature specifications.

Current Priority: **Phase 1 completed** (Project Setup)
Next: **Phase 2** (Authentication Module)
