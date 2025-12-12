# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AIncome - AI-Powered Personal Finance Tracker** - A modern mobile expense tracking application built with Expo (React Native) and Supabase backend, featuring AI-powered transaction parsing and personalized financial advice.

**Key Features:**
- 🤖 AI-powered chatbot for natural transaction input
- 💬 Personalized financial advisor with context-aware recommendations
- 📱 Pending transactions from bank notifications (with simulator)
- 💰 Goal allocation system with balance tracking
- 📊 Comprehensive financial analytics and insights
- 💵 Transaction management (income/expense tracking)
- 🎯 Budget management with smart alerts
- 🏆 Saving goals with progress tracking
- 📈 Analysis and reports with interactive charts
- 🌍 Multi-currency support
- 🌙 Dark mode support
- 🎨 Custom category icons

## Tech Stack

### Frontend
- **Framework**: Expo (React Native) + TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **UI Components**: Custom themed components with LinearGradient
- **Charts**: React Native Chart Kit
- **Date Handling**: date-fns
- **Icons**: Expo Vector Icons + Custom emoji icons

### Backend
- **BaaS**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Edge Functions**: Deno runtime
- **AI Integration**: Google Gemini 2.0 Flash API
- **Real-time**: Supabase Realtime for live updates

### AI & Intelligence
- **Transaction Parsing**: Gemini AI with fallback rule-based parser
- **Financial Advisor**: Context-aware AI with user personalization
- **Intent Classification**: Smart intent detection for chat messages
- **Category Suggestions**: AI-powered category recommendations

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
├── components/           # Reusable UI components
│   ├── common/          # Shared components
│   │   ├── Card.tsx
│   │   ├── EmptyState.tsx
│   │   ├── CategoryIcon.tsx
│   │   ├── CustomIconPicker.tsx
│   │   ├── ThemedButton.tsx
│   │   └── ThemedTextInput.tsx
│   ├── chat/            # Chat interface components
│   │   ├── ChatInterface.tsx
│   │   ├── TransactionConfirmationCard.tsx
│   │   └── FormattedText.tsx
│   └── goals/           # Goal-related components
│       ├── BalanceOverviewCard.tsx
│       ├── GoalAllocationCard.tsx
│       ├── AllocationModal.tsx
│       └── SpendingWarningModal.tsx
├── screens/             # Screen components
│   ├── auth/           # Login, Signup, ForgotPassword
│   ├── onboarding/     # Welcome & Initial Setup
│   ├── home/           # Home, Transactions, Pending Transactions
│   ├── budget/         # Budget management (Budgets + Savings Goals tabs)
│   ├── analysis/       # Enhanced analytics with charts
│   ├── profile/        # Settings, Profile, Security, Categories
│   └── goals/          # Saving goals management
├── navigation/         # Navigation configuration
│   ├── RootNavigator.tsx
│   ├── HomeNavigator.tsx
│   ├── BudgetNavigator.tsx
│   ├── AnalysisNavigator.tsx
│   ├── ProfileNavigator.tsx
│   └── types.ts
├── stores/             # Zustand state stores
│   ├── authStore.ts
│   ├── chatStore.ts
│   ├── themeStore.ts
│   └── pendingTransactionsStore.ts
├── services/           # Business logic & API services
│   ├── supabase.ts
│   ├── aiService.ts
│   ├── financialAnalyticsService.ts
│   └── goalAllocationService.ts
├── hooks/              # Custom React hooks
│   └── useThemedStyles.ts
├── utils/              # Helper functions
│   ├── helpers.ts
│   ├── validation.ts
│   └── intentClassifier.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── constants/          # App constants
│   └── index.ts
└── theme/              # Theme configuration
    └── modernTheme.ts

supabase/
├── functions/          # Edge Functions (Deno runtime)
│   ├── chat-gemini/          # AI chatbot & financial advisor
│   ├── parse-transaction/    # AI transaction parser
│   └── receive-bank-transaction/  # Bank notification webhook
└── migrations/         # Database migrations (001-014)
    ├── 001-006_*.sql         # Core schema
    ├── 007_financial_analytics_system.sql
    ├── 008_goal_allocations_system.sql
    ├── 009_add_custom_icons.sql
    └── 014_pending_transactions.sql

bank-simulator/         # Bank transaction simulator website
└── index.html         # Standalone HTML simulator
```

## Architecture

### Data Flow
1. **Screens** consume data from **Zustand stores**
2. **Stores** interact with **Supabase** via **services**
3. **Services** implement business logic and call Supabase/Edge Functions
4. **Edge Functions** handle AI processing (Gemini API)
5. **Realtime subscriptions** push updates to clients
6. **RLS policies** ensure data security (users only see their own data)

### Key Patterns
- **Atomic State Management**: Each module has its own Zustand store
- **RLS Security**: All database queries filtered by authenticated user
- **Type Safety**: Full TypeScript coverage with strict types
- **Component Reusability**: Themed components with `useThemedStyles` hook
- **AI Integration**: Edge Functions for server-side AI processing
- **Real-time Updates**: Supabase Realtime for live data synchronization

## Database Schema

### Core Tables
- `profiles` - User settings, preferences, and personalization data
- `categories` - Income/expense categories (default + custom with icons)
- `transactions` - All income/expense records
- `budgets` - Budget limits by category with periods
- `saving_goals` - Savings targets with progress tracking
- `goal_allocations` - Money allocated to specific goals
- `pending_transactions` - Bank notifications awaiting user confirmation
- `financial_analytics` - Pre-calculated analytics data

### Key Relationships
- Transactions → Categories (many-to-one)
- Budgets → Categories (many-to-one)
- Goal Allocations → Saving Goals (many-to-one)
- Pending Transactions → Users (many-to-one)
- Financial Analytics → Users (one-to-one per period)
- All tables → Users (via RLS policies)

### Important Functions & Views
- `get_goal_progress(goal_id)` - Calculate saving goal progress
- `get_budget_spending(budget_id)` - Calculate budget usage
- `get_available_balance(user_id)` - Calculate available balance (net - allocated)
- `user_balance` view - Real-time net balance calculation
- `refresh_user_analytics(user_id)` - Regenerate analytics data
- `initialize_user_analytics(user_id)` - Create initial analytics

### Edge Functions
1. **chat-gemini** - AI chatbot and financial advisor
   - Natural conversation with context
   - Personalized financial advice
   - User personalization aware

2. **parse-transaction** - AI transaction parser
   - Extract amount, category, type, date from natural language
   - Confidence scoring
   - Category suggestions

3. **receive-bank-transaction** - Bank notification webhook
   - Receives simulated bank SMS
   - Parses transaction data
   - Creates pending transaction

## Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Run migrations in `supabase/migrations/` in order (001-014)
3. Deploy Edge Functions:
   ```bash
   npx supabase functions deploy chat-gemini
   npx supabase functions deploy parse-transaction
   npx supabase functions deploy receive-bank-transaction
   ```
4. Set secrets in Supabase Dashboard:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-gemini-key
   ```
5. Copy credentials to `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

## Development Workflow

### Adding a New Feature
1. Create types in `src/types/index.ts`
2. Create Zustand store in `src/stores/` if needed
3. Create service in `src/services/` for business logic
4. Create reusable components in `src/components/`
5. Create screen components in `src/screens/`
6. Add navigation routes in appropriate navigator
7. Update database schema if needed (new migration)
8. Create Edge Function if server-side logic required

### Working with AI Features
- AI processing happens in Edge Functions (server-side)
- Client sends requests to Edge Functions via fetch
- Use `aiService.ts` for client-side AI interactions
- Handle AI responses with proper error handling
- Show loading states during AI processing

### Working with Supabase
- Client initialized in `src/services/supabase.ts` with custom storage adapter
- Always use RLS-protected queries
- Use TypeScript types from `src/types/`
- Handle auth state in `authStore.ts`
- Subscribe to Realtime updates for live data

### State Management Pattern
```typescript
// stores/exampleStore.ts
import { create } from 'zustand';

interface ExampleState {
  data: any[];
  isLoading: boolean;
  fetchData: (userId: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  data: [],
  isLoading: false,
  fetchData: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', userId);
    set({ data, isLoading: false });
  },
  subscribeToRealtime: (userId) => {
    supabase
      .channel('table-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table' }, (payload) => {
        // Handle real-time updates
      })
      .subscribe();
  },
}));
```

## Key Modules

### Module 1: Authentication
- Login/Signup with Supabase Auth
- Auto profile creation via database trigger
- Session persistence with AsyncStorage
- Custom storage adapter for error handling

### Module 2: Onboarding
- Welcome screens for first-time users
- Initial setup (currency, categories)
- Personalization questionnaire (optional)
- Onboarding completion tracking

### Module 3: Transactions
- Form-based transaction entry
- AI chat-based transaction entry
- Category selection with custom icons
- Date grouping and filtering
- Net Balance calculation
- Transaction validation

### Module 4: AI Chat Assistant
- Natural language transaction input
- Intent classification (transaction, advice, small talk)
- Transaction confirmation cards with edit/confirm/reject
- Real-time parsing with AI
- Fallback to rule-based parser
- Multi-transaction support

### Module 5: Financial Advisor
- Context-aware financial advice
- User personalization (goals, knowledge level, concerns)
- Pre-calculated analytics for fast insights
- Spending trends analysis
- Budget recommendations
- Goal suggestions

### Module 6: Pending Transactions
- Bank notification simulation (bank-simulator website)
- Real-time pending transaction updates
- Review, edit, confirm, or reject workflow
- Auto-parsing of bank SMS messages
- Edge Function webhook for receiving notifications

### Module 7: Goal Allocation System
- Net balance = Total income - Total expenses
- Allocated balance = Sum of money allocated to goals
- Available balance = Net balance - Allocated balance
- Deposit/withdraw to/from goals
- Spending warnings when over-allocated
- Balance overview card

### Module 8: Budget Management
- Create budgets by category
- Progress tracking with color-coded alerts
- Budget period support (month/quarter/year)
- Alert thresholds (70%, 80%, 90%, 100%)
- Budget impact warnings

### Module 9: Saving Goals
- Goal creation with target amounts and dates
- Goal allocation tracking
- Progress visualization
- Monthly saving rate analysis
- Completion celebration

### Module 10: Financial Analytics
- Pre-calculated analytics for performance
- Income vs Expense trends
- Category breakdown
- Spending patterns
- Time period filtering
- Automated reporting

### Module 11: Analysis & Reports
- Interactive charts (line, pie, bar)
- Category breakdown visualization
- Period comparison (month, quarter, year)
- Top spending categories
- Transaction details drill-down

### Module 12: Profile & Settings
- User profile management with avatar
- App settings (currency, theme, notifications)
- Security settings
- Category management with custom icons
- Personalization preferences

## Important Formulas & Business Logic

### Balance Calculations
- **Net Balance**: `Total Income - Total Expense`
- **Allocated Balance**: `SUM(goal_allocations.amount WHERE active = true)`
- **Available Balance**: `Net Balance - Allocated Balance`

### Goal Progress
- Calculated from goal allocations, not net balance
- Progress % = `(Current Amount / Target Amount) * 100`
- Monthly rate = `Total Allocated / Months Elapsed`

### Budget Alerts
- Triggered when adding expenses that exceed thresholds
- Checks against budget period spending
- Color-coded warnings at 70%, 80%, 90%, 100%

### Analytics Refresh
- Auto-refresh via database trigger on transaction insert/update/delete
- Manual refresh available via `financialAnalyticsService.refreshMyAnalytics()`
- Analytics calculated for last 12 months

## AI Integration Details

### Transaction Parsing
1. User inputs natural language (e.g., "ăn phở 50k")
2. Client calls `parse-transaction` Edge Function
3. Gemini AI extracts: type, amount, category, date, note
4. Returns confidence score and suggested category
5. Fallback to rule-based parser if AI fails
6. User confirms/edits before saving

### Financial Advisor
1. User asks question or uses quick actions
2. Client calls `chat-gemini` Edge Function with context
3. Edge Function fetches user's financial data and personalization
4. Gemini generates personalized advice
5. Response formatted with markdown support
6. Includes actionable recommendations

### Personalization System
- Financial goals (retirement, house, emergency fund, etc.)
- Financial knowledge level (beginner, intermediate, advanced)
- Communication style (casual, formal, professional)
- Age range, income level, family situation
- Financial concerns (debt, savings, budgeting, etc.)
- Used to tailor AI responses and advice

## Bank Simulator

### Purpose
Demo realistic bank transaction auto-detection without real bank integration.

### How It Works
1. Open `bank-simulator/index.html` in browser
2. Configure user ID and webhook URL
3. Select bank (BIDV, VietcomBank, Techcombank, VPBank)
4. Customize transaction details
5. Click "Send Transaction"
6. Simulated SMS sent to Edge Function
7. Pending transaction created in database
8. Mobile app shows notification in real-time
9. User reviews and confirms/rejects

## Theme System

### Dynamic Theming
- `themeStore.ts` manages theme state (light/dark)
- `modernTheme.ts` defines color palettes and styles
- `useThemedStyles` hook for component styling
- Supports system theme preference
- Smooth theme transitions

### Theme Colors
- Primary: Blue gradient
- Success: Green (income)
- Danger: Red (expense)
- Warning: Yellow (alerts)
- Surface: Card backgrounds
- Text: Primary, Secondary, Tertiary levels

## Common Tasks

### Add a new screen
1. Create in `src/screens/[module]/NewScreen.tsx`
2. Add route to navigation in `src/navigation/[Module]Navigator.tsx`
3. Add types to `src/navigation/types.ts`
4. Use `useThemedStyles` for styling

### Add a new store
1. Create in `src/stores/newStore.ts`
2. Define interface with state and actions
3. Import and use in components with `useNewStore()`
4. Add Realtime subscriptions if needed

### Add a database table
1. Create migration in `supabase/migrations/0XX_description.sql`
2. Add types to `src/types/index.ts`
3. Enable RLS and add policies
4. Deploy migration to Supabase
5. Create service functions in `src/services/`

### Add an Edge Function
1. Create in `supabase/functions/function-name/index.ts`
2. Implement Deno handler with CORS
3. Test locally with `npx supabase functions serve`
4. Deploy with `npx supabase functions deploy function-name`
5. Set secrets if needed with `npx supabase secrets set`

## Troubleshooting

### Common Issues
- **Navigation errors**: Ensure all screens are registered in navigators
- **Type errors**: Check `src/types/` for interface definitions
- **Supabase errors**: Verify `.env` credentials and RLS policies
- **Build errors**: Clear cache with `npx expo start --clear`
- **AI errors**: Check Edge Function logs and Gemini API key
- **Realtime not working**: Verify RLS policies allow realtime access
- **Theme not applying**: Check if `useThemedStyles` is used correctly

### Debug Tips
- Check console logs (43 debug logs in codebase)
- Use Supabase Dashboard → Logs for Edge Function errors
- Test Edge Functions with Postman/curl
- Verify RLS policies in Supabase Dashboard → Authentication → Policies
- Check Realtime subscriptions in Supabase Dashboard → Database → Replication

## Documentation

### Available Guides
- `docs/CHATBOT_FEATURE.md` - Chat implementation details
- `docs/CHATBOT_FINANCIAL_ADVISOR_GUIDE.md` - Financial advisor guide
- `docs/PERSONALIZATION_FEATURE.md` - User personalization system
- `docs/FINANCIAL_ANALYTICS_README.md` - Analytics service guide
- `docs/GOAL_ALLOCATION_IMPLEMENTATION_PLAN.md` - Goal allocation plan
- `docs/GOAL_ALLOCATION_PROGRESS.md` - Implementation progress
- `docs/IMPLEMENTATION_EXAMPLE.md` - Code examples and patterns

## Project Status

**Current Status**: ✅ **Production Ready**

**Completed Features**:
- ✅ Core transaction management
- ✅ AI-powered chat assistant
- ✅ Financial advisor with personalization
- ✅ Pending transactions system
- ✅ Goal allocation system
- ✅ Financial analytics
- ✅ Budget management with alerts
- ✅ Saving goals
- ✅ Enhanced analysis screens
- ✅ Theme system with dark mode
- ✅ Custom category icons
- ✅ Bank transaction simulator

**Database**: 14 migrations deployed
**Edge Functions**: 3 deployed (chat-gemini, parse-transaction, receive-bank-transaction)
**Components**: 50+ reusable components
**Screens**: 20+ screens across 5 navigators

## Performance Considerations

### Optimization Strategies
1. **Pre-calculated Analytics**: Analytics data calculated once and stored
2. **Realtime Subscriptions**: Efficient filtered subscriptions
3. **Lazy Loading**: Screens loaded on demand via navigation
4. **Memoization**: Use React.memo for expensive components
5. **Pagination**: Limit query results with `.limit()`
6. **Image Optimization**: Avatar images optimized via Supabase Storage

### Before Production Deployment
1. Remove debug console.log statements (keep console.error)
2. Enable production mode in Expo
3. Optimize bundle size with tree shaking
4. Test on real devices (not just emulator)
5. Verify all Edge Functions have proper error handling
6. Test with real Gemini API usage limits
7. Set up monitoring/analytics (optional)

---

**Last Updated**: December 12, 2025
**Version**: 1.0.0 (Production Release)
