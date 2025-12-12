# AIncome - AI-Powered Personal Finance Tracker 💰

A modern mobile application for tracking personal finances with AI-powered transaction parsing, personalized financial advice, and comprehensive budget management. Built with Expo (React Native), Supabase backend, and Google Gemini AI.

## 🎯 Project Status

**Version**: 1.0.0
**Development Status**: ✅ **Production Ready**
**Last Updated**: December 12, 2025

### ✅ All Features Complete

The application includes all core features plus advanced AI capabilities:
- ✅ Core transaction and budget management
- ✅ AI-powered chatbot for natural transaction input
- ✅ Personalized financial advisor with context-aware recommendations
- ✅ Pending transactions from bank notifications
- ✅ Goal allocation system with balance tracking
- ✅ Financial analytics and insights
- ✅ Multi-currency and multi-language support
- ✅ Dark mode and theme customization
- ✅ Custom category icons

---

## 📱 Features Overview

### 🤖 AI-Powered Features

#### AI Transaction Parser
- Natural language transaction input (e.g., "ăn phở 50k", "lunch $15")
- Automatic extraction of amount, category, type, and date
- Confidence scoring and smart category suggestions
- Fallback to rule-based parser for reliability
- Support for Vietnamese and English inputs

#### AI Financial Advisor
- Context-aware personalized financial advice
- User personalization based on goals, knowledge level, and concerns
- Pre-calculated analytics for instant insights
- Spending trend analysis and recommendations
- Budget optimization suggestions
- Goal achievement strategies
- Natural conversation interface with markdown formatting

#### AI Chatbot Assistant
- Intent classification (transaction, advice, small talk)
- Transaction confirmation cards with edit/confirm/reject options
- Multi-transaction support in a single message
- Real-time parsing and validation
- Conversation history tracking

### 🌟 What Makes This Project Unique

Unlike traditional finance apps, AIncome leverages cutting-edge AI technology to provide:

1. **Conversational Transaction Entry**: Simply type "ăn phở 50k" instead of filling out forms
2. **Personalized Financial Coaching**: Get tailored advice based on your goals and financial situation
3. **Smart Bank Integration**: Auto-capture transactions from bank notifications (simulated)
4. **Intelligent Balance Management**: Separate tracking of allocated vs available money
5. **Context-Aware Insights**: Pre-calculated analytics enable instant, relevant recommendations
6. **Multi-language AI**: Works seamlessly in Vietnamese and English

### Core Functionality

#### 🔐 Authentication & Onboarding
- Secure user authentication with Supabase Auth
- Email/password login and registration
- Onboarding wizard with personalization questionnaire
- Currency and language selection (10 currencies, 8 languages)
- Default category setup (17 categories)
- Session management with auto-persistence

#### 💸 Transaction Management
- **Traditional Form**: Add/edit transactions via form interface
- **AI Chat Input**: Natural language transaction entry
- **Pending Transactions**: Review bank notifications before confirming
- Real-time net balance calculation (Income - Expense)
- Category-based organization with custom icons and colors
- Transaction history with date grouping
- Optional notes for each transaction
- Pull-to-refresh data updates

#### 📊 Budget Management
- Create budgets by category with customizable periods
- **Periods**: Monthly, Quarterly, Yearly
- Real-time spending tracking with progress bars
- **Alert System**: Color-coded status (Green/Yellow/Red)
- **Alert Thresholds**: 70%, 75%, 80%, 85%, 90%, 95%, 100%
- Budget detail view with transaction history
- Over-budget warnings and notifications

#### 🎯 Saving Goals & Allocations
- Create savings goals with target amounts and dates
- **Goal Allocation System**:
  - Allocate money from available balance to specific goals
  - Track allocated vs available balance
  - Withdraw from goals when needed
  - Balance overview card showing net, allocated, and available balance
  - Spending warnings when over-allocated
- **Progress Tracking**: Based on goal allocations (not net balance)
- **Timeline Awareness**: Expected vs Actual progress comparison
- **Status System**: Completed (🟢), On Track (🔵), Behind (🟡), Overdue (🔴)
- Monthly saving rate analysis and recommendations
- Projection system to forecast goal achievement
- Celebration UI for achieved goals

#### 📱 Pending Transactions
- Receive simulated bank notifications via webhook
- Real-time pending transaction updates
- Review, edit, confirm, or reject workflow
- Auto-parsing of bank SMS messages (AI-powered)
- Integration with bank simulator for testing
- Edge Function webhook for receiving notifications

#### 📈 Analysis & Reports
- **Pre-calculated Analytics**: Fast insights via financial analytics system
- **Interactive Charts**:
  - Income vs Expense bar charts
  - Monthly trends line charts
  - Category breakdown pie charts
- **Time Periods**: This Month, Last Month, Last 3 Months, This Year
- **Automated Reporting**: Analytics refresh on transaction changes
- Category-wise spending percentages
- Top spending categories identification
- Visual financial insights
- Spending patterns and trends

#### 🗂️ Category Management
- 17 default categories (5 income, 12 expense)
- Create custom categories with **custom emoji/icon selection**
- Edit category details (name, icon, color)
- Delete unused categories
- **Custom Icon Picker**: Choose any emoji as category icon
- **Icon Library**: Built-in icon sets for common categories
- **Color Palette**: 14 predefined colors
- Duplicate prevention and validation

#### ⚙️ Profile & Settings
- **Profile Management**:
  - Full name and avatar
  - Avatar upload to Supabase Storage
  - Profile photo management
- **App Settings**:
  - Currency (10 options: VND, USD, EUR, GBP, JPY, CNY, KRW, SGD, THB, MYR)
  - Language (8 options: EN, VI, ES, FR, DE, ZH, JA, KO)
  - Theme (Light, Dark, Auto)
  - Notification preferences
  - Budget alerts toggle
  - Goal reminders toggle
- **Security**:
  - Change password with validation
  - Password reset via email
  - Account deletion with double confirmation

#### 🎨 UI/UX Polish
- **Loading Skeletons**: 7 variants (Transaction, Budget, Goal, Category, Chart, Profile)
- **Empty States**: Consistent empty state UI across all screens
- **Toast Notifications**: Success, Error, Info, Warning feedback
- **Error Boundary**: Catches errors to prevent app crashes
- **Loading Overlay**: Full-screen loading indicator
- **Success Animation**: Animated checkmark for important actions
- **Card Components**: 6 reusable card types
- **Utility Functions**: 10+ helper functions

---

## 🛠️ Tech Stack

### Frontend
| Category | Technology |
|----------|------------|
| **Framework** | [Expo](https://expo.dev) SDK 54 (React Native) |
| **Language** | TypeScript 5.9 |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) 5.0.2 |
| **Navigation** | [React Navigation](https://reactnavigation.org) 7.0 |
| **UI Components** | Custom themed components with LinearGradient |
| **Charts** | [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit) 6.12.0 |
| **Date Handling** | [date-fns](https://date-fns.org) 4.1.0 |
| **Icons** | Expo Vector Icons + Custom emoji icons |
| **Image Picker** | expo-image-picker 16.0.3 |

### Backend
| Category | Technology |
|----------|------------|
| **BaaS** | [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage + Realtime) |
| **Edge Functions** | Deno runtime on Supabase |
| **AI Integration** | Google Gemini 2.0 Flash API |
| **Real-time** | Supabase Realtime for live updates |
| **Database** | PostgreSQL with Row Level Security (RLS) |

### AI & Intelligence
| Feature | Technology |
|---------|------------|
| **Transaction Parsing** | Gemini AI with fallback rule-based parser |
| **Financial Advisor** | Context-aware AI with user personalization |
| **Intent Classification** | Smart intent detection for chat messages |
| **Category Suggestions** | AI-powered category recommendations |

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js**: >= 18.x
- **npm** or **yarn**: Latest version
- **Expo CLI**: `npm install -g expo-cli`
- **Supabase Account**: [Free tier available](https://supabase.com)
- **Google AI Studio Account**: For Gemini API key ([Get API key](https://aistudio.google.com/apikey))
- **Mobile Device or Emulator**:
  - iOS Simulator (macOS only)
  - Android Emulator
  - Physical device with Expo Go app

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AIncome
```

### 2. Install Dependencies

```bash
npm install
```

**Key Dependencies Installed**:
- `expo` - Framework
- `react-native` - Mobile framework
- `@supabase/supabase-js` - Backend client
- `zustand` - State management
- `@react-navigation/native` - Navigation
- `react-native-paper` - UI components
- `react-native-chart-kit` - Charts
- `date-fns` - Date utilities
- `expo-image-picker` - Image selection

### 3. Setup Supabase

#### A. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization (~2 minutes)

#### B. Run Database Migrations

**Important**: Run all 14 migrations in order!

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run each migration file from `supabase/migrations/` in order (001-014):

**Key Migrations**:
- **001-006**: Core schema (profiles, categories, transactions, budgets, goals)
- **007**: Financial analytics system (pre-calculated analytics)
- **008**: Goal allocations system (allocate balance to goals)
- **009**: Add custom icons support for categories
- **010-013**: Additional enhancements and fixes
- **014**: Pending transactions system (bank notifications)

Each migration file contains detailed comments explaining its purpose.

For detailed migration setup, see: `supabase/README.md` or `docs/` folder

#### C. Deploy Edge Functions

**Important**: Deploy all 3 Edge Functions for AI features to work!

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   npx supabase login
   ```

3. Link your project:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

4. Set the Gemini API key secret:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key
   ```

5. Deploy the Edge Functions:
   ```bash
   npx supabase functions deploy chat-gemini
   npx supabase functions deploy parse-transaction
   npx supabase functions deploy receive-bank-transaction
   ```

**Edge Functions**:
- `chat-gemini` - AI chatbot and financial advisor
- `parse-transaction` - Natural language transaction parser
- `receive-bank-transaction` - Bank notification webhook

#### D. Get API Credentials

1. Go to **Project Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration
EXPO_PUBLIC_APP_NAME=AIncome
EXPO_PUBLIC_DEFAULT_CURRENCY=VND
EXPO_PUBLIC_DEFAULT_LANGUAGE=vi
```

**Note**: See `.env.example` for template.
**Important**: The Gemini API key is set as a Supabase secret (not in .env), as it's used by Edge Functions.

### 5. Start Development Server

```bash
npm start
```

or with specific port:

```bash
npx expo start --port 8083
```

**Then**:
- Press **`a`** to open on Android emulator
- Press **`i`** to open on iOS simulator (macOS only)
- Press **`w`** to open in web browser
- Scan QR code with **Expo Go** app on your phone

---

## 📁 Project Structure

```
AIncome/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Shared components
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── CategoryIcon.tsx
│   │   │   ├── CustomIconPicker.tsx
│   │   │   ├── ThemedButton.tsx
│   │   │   └── ThemedTextInput.tsx
│   │   ├── chat/            # Chat interface components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── TransactionConfirmationCard.tsx
│   │   │   └── FormattedText.tsx
│   │   ├── goals/           # Goal-related components
│   │   │   ├── BalanceOverviewCard.tsx
│   │   │   ├── GoalAllocationCard.tsx
│   │   │   ├── AllocationModal.tsx
│   │   │   └── SpendingWarningModal.tsx
│   │   ├── transactions/    # Transaction components
│   │   ├── budget/          # Budget components
│   │   └── charts/          # Chart components
│   │
│   ├── screens/             # Screen components
│   │   ├── auth/            # Login, Signup, ForgotPassword
│   │   ├── onboarding/      # Welcome & Initial Setup
│   │   ├── home/            # Home, Transactions, Pending Transactions
│   │   ├── budget/          # Budget management (Budgets + Savings Goals tabs)
│   │   ├── goals/           # Saving goals management
│   │   ├── analysis/        # Enhanced analytics with charts
│   │   ├── profile/         # Settings, Profile, Security, Categories
│   │   └── transactions/    # Transaction screens
│   │
│   ├── navigation/          # Navigation configuration
│   │   ├── RootNavigator.tsx
│   │   ├── HomeNavigator.tsx
│   │   ├── BudgetNavigator.tsx
│   │   ├── AnalysisNavigator.tsx
│   │   ├── ProfileNavigator.tsx
│   │   └── types.ts
│   │
│   ├── services/            # Business logic & API services
│   │   ├── supabase.ts
│   │   ├── aiService.ts
│   │   ├── financialAnalyticsService.ts
│   │   └── goalAllocationService.ts
│   │
│   ├── stores/              # Zustand state stores
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   ├── themeStore.ts
│   │   └── pendingTransactionsStore.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── useThemedStyles.ts
│   │
│   ├── utils/               # Helper functions
│   │   ├── helpers.ts
│   │   ├── validation.ts
│   │   └── intentClassifier.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── constants/           # App constants
│   │   └── index.ts
│   │
│   └── theme/               # Theme configuration
│       └── modernTheme.ts
│
├── supabase/
│   ├── functions/           # Edge Functions (Deno runtime)
│   │   ├── chat-gemini/           # AI chatbot & financial advisor
│   │   ├── parse-transaction/     # AI transaction parser
│   │   └── receive-bank-transaction/  # Bank notification webhook
│   ├── migrations/          # Database migrations (001-014)
│   │   ├── 001-006_*.sql          # Core schema
│   │   ├── 007_financial_analytics_system.sql
│   │   ├── 008_goal_allocations_system.sql
│   │   ├── 009_add_custom_icons.sql
│   │   └── 014_pending_transactions.sql
│   └── README.md            # Supabase setup guide
│
├── bank-simulator/          # Bank transaction simulator website
│   └── index.html           # Standalone HTML simulator
│
├── docs/                    # Documentation
│   ├── CHATBOT_FEATURE.md
│   ├── CHATBOT_FINANCIAL_ADVISOR_GUIDE.md
│   ├── PERSONALIZATION_FEATURE.md
│   ├── FINANCIAL_ANALYTICS_README.md
│   ├── GOAL_ALLOCATION_IMPLEMENTATION_PLAN.md
│   └── Product Requirement Document.txt
│
├── assets/                  # App assets
│   ├── icon.png
│   ├── splash-icon.png
│   └── adaptive-icon.png
│
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Environment template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── app.json                 # Expo config
├── App.tsx                  # App entry point
├── README.md                # This file
└── CLAUDE.md                # Developer guide
```

---

## 🗄️ Database Schema

### Core Tables (14 migrations total)

#### 1. **profiles**
User profiles with personalization settings.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'VND',
  language TEXT DEFAULT 'EN',
  theme TEXT DEFAULT 'light',
  -- Personalization for AI advisor
  financial_goals TEXT[],
  financial_knowledge_level TEXT,
  communication_style TEXT,
  age_range TEXT,
  income_level TEXT,
  family_situation TEXT,
  financial_concerns TEXT[],
  -- Settings
  notifications BOOLEAN DEFAULT true,
  budget_alerts BOOLEAN DEFAULT true,
  goal_reminders BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own profile.

#### 2. **categories**
Income and expense categories with custom icons.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL,
  custom_icon TEXT,  -- Custom emoji icon
  color TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can see default categories (user_id IS NULL) and their own categories.

**Default Categories**: 17 seeded (5 income, 12 expense)

#### 3. **transactions**
All financial transactions.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(15, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own transactions.

#### 4. **budgets**
Budget limits by category.

```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  alert_threshold INTEGER DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own budgets.

**Alert Thresholds**: 70%, 75%, 80%, 85%, 90%, 95%, 100%

#### 5. **saving_goals**
Savings targets with progress tracking.

```sql
CREATE TABLE saving_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE NOT NULL,
  start_date DATE DEFAULT NOW(),
  icon TEXT,
  color TEXT,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own goals.

#### 6. **goal_allocations**
Money allocated to specific goals from available balance.

```sql
CREATE TABLE goal_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  goal_id UUID REFERENCES saving_goals(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  note TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own allocations.

**Purpose**: Track money movement into/out of goals, separate from net balance.

#### 7. **pending_transactions**
Bank notifications awaiting user confirmation.

```sql
CREATE TABLE pending_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  bank_name TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  transaction_type TEXT,
  description TEXT,
  transaction_time TIMESTAMPTZ,
  raw_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  parsed_category_id UUID REFERENCES categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own pending transactions.

**Purpose**: Capture bank SMS/notifications for review before adding to transactions.

#### 8. **financial_analytics**
Pre-calculated analytics for fast insights.

```sql
CREATE TABLE financial_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  period TEXT NOT NULL,
  total_income DECIMAL(15, 2) DEFAULT 0,
  total_expense DECIMAL(15, 2) DEFAULT 0,
  net_balance DECIMAL(15, 2) DEFAULT 0,
  top_expense_category TEXT,
  top_income_category TEXT,
  category_breakdown JSONB,
  spending_trends JSONB,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS**: Users can only access their own analytics.

**Purpose**: Store pre-calculated analytics to avoid expensive queries during AI advisor responses.

### Security: Row Level Security (RLS)

All tables have RLS policies ensuring:
- Users can only access their own data
- Default categories are visible to all users
- Avatar uploads are scoped to user folders

### Database Functions

- `get_goal_progress(goal_id)` - Calculate saving goal progress based on allocations
- `get_budget_spending(budget_id)` - Calculate budget usage
- `get_available_balance(user_id)` - Calculate available balance (net - allocated)
- `refresh_user_analytics(user_id)` - Regenerate analytics data
- `initialize_user_analytics(user_id)` - Create initial analytics

### Views

- `user_balance` - Real-time net balance calculation (income - expense)

### Triggers

- Auto-refresh analytics on transaction insert/update/delete
- Auto-create user profile on signup
- Auto-update timestamps

---

## 🔧 Available Scripts

```bash
# Development
npm start                 # Start Expo development server
npm run android           # Run on Android emulator
npm run ios               # Run on iOS simulator (macOS only)
npm run web               # Run in web browser

# Type Checking
npx tsc --noEmit          # Run TypeScript type checking

# Cleaning
npx expo start --clear    # Clear cache and restart

# Database
node setup-database.js    # Setup database (helper script)
node test-database.js     # Test database connection
node run-migrations.js    # Run migrations (helper)
```

---

## 📚 Module Documentation

### Module 1: AI Chat Assistant
**Location**: `src/screens/home/`, `src/components/chat/`, `src/services/aiService.ts`

**Features**:
- Natural language transaction input
- Intent classification (transaction, advice, small talk)
- Transaction confirmation cards with edit/confirm/reject
- Real-time parsing with AI (Gemini 2.0 Flash)
- Fallback to rule-based parser
- Multi-transaction support
- Conversation history tracking

**Components**:
- `ChatInterface.tsx` - Main chat UI
- `TransactionConfirmationCard.tsx` - Confirmation UI
- `FormattedText.tsx` - Markdown rendering

**Edge Function**: `chat-gemini` for AI processing

---

### Module 2: Financial Advisor
**Location**: `src/services/aiService.ts`, `supabase/functions/chat-gemini/`

**Features**:
- Context-aware personalized financial advice
- User personalization (goals, knowledge level, concerns)
- Pre-calculated analytics for fast insights
- Spending trends analysis
- Budget recommendations
- Goal suggestions
- Natural conversation with markdown support

**Personalization Fields**:
- Financial goals, knowledge level, communication style
- Age range, income level, family situation
- Financial concerns

**Edge Function**: `chat-gemini` with financial advisor mode

---

### Module 3: Pending Transactions
**Location**: `src/screens/home/PendingTransactionsScreen.tsx`, `src/stores/pendingTransactionsStore.ts`

**Features**:
- Receive simulated bank notifications
- Real-time pending transaction updates via Realtime
- Review, edit, confirm, or reject workflow
- Auto-parsing of bank SMS messages
- Integration with bank simulator

**Edge Function**: `receive-bank-transaction` webhook

**Bank Simulator**: `bank-simulator/index.html` for testing

---

### Module 4: Goal Allocation System
**Location**: `src/services/goalAllocationService.ts`, `src/components/goals/`

**Features**:
- Allocate money to specific goals
- Track allocated vs available balance
- Deposit/withdraw to/from goals
- Balance overview card
- Spending warnings when over-allocated
- Progress based on allocations (not net balance)

**Components**:
- `BalanceOverviewCard.tsx` - Shows net, allocated, available balance
- `GoalAllocationCard.tsx` - Goal allocation interface
- `AllocationModal.tsx` - Deposit/withdraw modal
- `SpendingWarningModal.tsx` - Over-allocation warning

**Formulas**:
- Net Balance = Total Income - Total Expense
- Allocated Balance = SUM(active allocations)
- Available Balance = Net Balance - Allocated Balance

---

### Module 5: Financial Analytics
**Location**: `src/services/financialAnalyticsService.ts`

**Features**:
- Pre-calculated analytics for performance
- Auto-refresh on transaction changes
- Category breakdown and trends
- Time period analysis
- Used by AI financial advisor

**Database**: `financial_analytics` table with auto-refresh triggers

---

### Module 6: Authentication
**Location**: `src/screens/auth/`

**Features**:
- Login with email/password
- Signup with email/password
- Auto profile creation via database trigger
- Session persistence with AsyncStorage
- Supabase Auth integration

**Screens**:
- `LoginScreen.tsx` - Login form
- `SignupScreen.tsx` - Registration form

---

### Module 7: Onboarding
**Location**: `src/screens/onboarding/`

**Features**:
- Welcome wizard for first-time users
- Currency selection (10 options)
- Language selection (8 options)
- Default category setup
- Onboarding completion tracking

**Screens**:
- `WelcomeScreen.tsx` - Welcome screen
- `OnboardingScreen.tsx` - Setup wizard

---

### Module 8: Transactions
**Location**: `src/screens/home/`

**Features**:
- Add/Edit/Delete transactions
- Type toggle (Income/Expense)
- Category selection grid
- Date picker (native)
- Optional notes
- Net balance calculation
- Recent transactions list (10 items)
- Pull-to-refresh

**Screens**:
- `HomeScreen.tsx` - Dashboard with balance and transactions
- `AddTransactionScreen.tsx` - Add/Edit form
- `TransactionDetailScreen.tsx` - View/Edit/Delete

**Net Balance Formula**: `Total Income - Total Expense`

---

### Module 9: Categories
**Location**: `src/screens/profile/`

**Features**:
- Create custom categories
- Edit category details (name, icon, color)
- Delete unused categories
- Type filtering (Income/Expense)
- Icon picker (5 income, 12 expense icons)
- Color picker (14 colors)
- Duplicate prevention

**Screens**:
- `CategoriesScreen.tsx` - Category list
- `CategoryFormScreen.tsx` - Add/Edit form

**Default Categories**: 17 seeded categories

---

### Module 10: Budgets
**Location**: `src/screens/budget/`

**Features**:
- Create budgets by category
- Three period types: Monthly, Quarterly, Yearly
- Auto date range calculation
- Real-time spending tracking
- Progress bars with color coding
- Alert thresholds (70-100%)
- Transaction history per budget

**Screens**:
- `BudgetScreen.tsx` - Budget list with progress
- `AddBudgetScreen.tsx` - Add/Edit form
- `BudgetDetailScreen.tsx` - Detail view with alerts

**Color Coding**:
- 🟢 Green (< 70%): On Track
- 🟡 Yellow (70-89%): Warning
- 🔴 Red (≥ 90%): Over Budget

---

### Module 11: Saving Goals
**Location**: `src/screens/goals/`

**Features**:
- Create savings goals with target amount and date
- Progress based on net balance since start date
- Timeline-aware tracking (Expected vs Actual)
- Monthly saving rate analysis
- Projection system
- Celebration UI for achievements

**Screens**:
- `GoalsScreen.tsx` - Goals list with status
- `AddGoalScreen.tsx` - Add/Edit form
- `GoalDetailScreen.tsx` - Detail with analysis

**Status System**:
- 🟢 Completed: Goal achieved (100%)
- 🔵 On Track: Actual ≥ Expected progress
- 🟡 Behind: Actual < Expected progress
- 🔴 Overdue: Past target date without completion

**Progress Formula**:
- **Expected Progress** = (Days Passed / Total Days) × 100
- **Actual Progress** = (Net Balance / Target Amount) × 100

---

### Module 12: Analysis & Reports
**Location**: `src/screens/analysis/`

**Features**:
- Interactive charts (Bar, Line, Pie)
- Time period selector (This Month, Last Month, Last 3 Months, This Year)
- Income vs Expense comparison
- Monthly trends visualization
- Category breakdown with percentages
- Summary statistics cards

**Screen**:
- `AnalysisScreen.tsx` - Comprehensive analysis dashboard

**Charts**:
1. **Bar Chart**: Income vs Expense comparison
2. **Line Chart**: Monthly trends (dual-line)
3. **Pie Chart**: Top 5 expense categories
4. **Lists**: Full category breakdown with percentages

---

### Module 13: Profile & Settings
**Location**: `src/screens/profile/`

**Features**:
- Profile management with avatar
- Avatar upload to Supabase Storage
- Currency selection (10 options)
- Language selection (8 options)
- Theme toggle (Light/Dark/Auto)
- Notification preferences
- Password change with validation
- Account deletion with double confirmation

**Screens**:
- `ProfileScreen.tsx` - Profile overview with menu
- `EditProfileScreen.tsx` - Edit profile and avatar
- `SettingsScreen.tsx` - App settings
- `SecurityScreen.tsx` - Password and account management

**Security Features**:
- Password validation (min 8 chars, uppercase, lowercase, number)
- Password reset via email
- Double confirmation for account deletion
- Cascade deletion of all user data

---

### Module 14: Theme System
**Location**: `src/components/common/`

**Components**:

#### 1. **Skeleton Loaders** (`Skeleton.tsx`)
7 variants for loading states:
- TransactionSkeleton
- BudgetSkeleton
- GoalSkeleton
- CategorySkeleton
- ChartSkeleton
- ProfileSkeleton
- Base Skeleton (customizable)

#### 2. **EmptyState** (`EmptyState.tsx`)
Consistent empty state UI with icon, title, description, and action button.

#### 3. **Toast Notifications** (`toast.ts`)
4 types: success ✅, error ❌, info ℹ️, warning ⚠️

```typescript
import { toast } from '@/utils/toast';
toast.success('Transaction saved!');
toast.error('Failed to load data');
```

#### 4. **Error Boundary** (`ErrorBoundary.tsx`)
Catches React errors and displays friendly error UI with retry option.

#### 5. **Loading Overlay** (`LoadingOverlay.tsx`)
Full-screen loading indicator with optional message.

#### 6. **Success Animation** (`SuccessAnimation.tsx`)
Animated checkmark with message for important actions.

#### 7. **Card Components** (`Card.tsx`)
6 reusable card types:
- Card (base)
- CardHeader
- InfoRow
- Divider
- Badge
- StatCard

**Usage Example**:
```typescript
import { Card, CardHeader, InfoRow } from '@/components/common';

<Card>
  <CardHeader icon="💰" title="Budget" subtitle="Monthly" />
  <InfoRow label="Amount" value="$1,000" />
</Card>
```

---

## 🎯 Key Concepts

### Balance Calculations
The app uses a three-tier balance system:

```
Net Balance = Total Income - Total Expense
Allocated Balance = SUM(active goal_allocations WHERE type = 'deposit')
Available Balance = Net Balance - Allocated Balance
```

- **Net Balance**: Actual money after all income and expenses
- **Allocated Balance**: Money set aside for specific goals
- **Available Balance**: Money available to spend or allocate to new goals

### Goal Progress Tracking
Goals track **allocated money** (not net balance), comparing actual progress to expected progress based on timeline.

```typescript
// Progress based on allocations
Actual Amount = SUM(goal_allocations WHERE goal_id = goal.id AND type = 'deposit')
Progress % = (Actual Amount / Target Amount) × 100

// Timeline awareness
Expected Progress = (Days Passed / Total Days) × 100
On Track = Actual Progress >= Expected Progress

// Status determination
if (Progress >= 100) return 'Completed' (🟢)
else if (Date.now() > target_date) return 'Overdue' (🔴)
else if (Actual >= Expected) return 'On Track' (🔵)
else return 'Behind' (🟡)
```

### Budget Status Determination
```typescript
Percentage = (Total Spent / Budget Amount) × 100

if (percentage >= 100) return 'Over Budget' (🔴)
if (percentage >= alert_threshold) return 'Warning' (🟡)
return 'On Track' (🟢)
```

### AI Transaction Parsing
The AI parser extracts structured data from natural language:

```typescript
Input: "ăn phở 50k" or "lunch $15"
Output: {
  amount: 50000 or 15,
  type: 'expense',
  category: 'Food',
  confidence: 0.95,
  date: today
}
```

Falls back to rule-based parser if AI confidence < 0.7.

---

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- [ ] Login with valid credentials
- [ ] Signup with new account
- [ ] Session persists after app restart
- [ ] Logout clears session

#### Transactions
- [ ] Add income transaction
- [ ] Add expense transaction
- [ ] Edit transaction
- [ ] Delete transaction
- [ ] Balance updates correctly

#### Budgets
- [ ] Create monthly budget
- [ ] Track spending progress
- [ ] Alert shows at threshold
- [ ] Over-budget status displays

#### Goals
- [ ] Create saving goal
- [ ] Progress updates with transactions
- [ ] On track status accurate
- [ ] Completion celebration shows

#### Categories
- [ ] Create custom category
- [ ] Edit category
- [ ] Delete unused category
- [ ] Categories appear in transactions

#### Analysis
- [ ] Charts display correctly
- [ ] Period selector works
- [ ] Category breakdown accurate

#### Profile
- [ ] Upload avatar
- [ ] Change settings
- [ ] Update password
- [ ] Delete account

### Automated Testing
Currently manual testing is performed. Phase 11 will add:
- Unit tests
- Integration tests
- E2E tests
- Performance tests

---

## 🚀 Deployment

### Prerequisites for Production
1. Update Supabase RLS policies for production
2. Configure environment variables for production
3. Set up error logging (e.g., Sentry)
4. Configure analytics (e.g., Firebase Analytics)
5. Set up push notifications (optional)

### Build for Production

#### Android (APK/AAB)
```bash
# Configure app.json for Android
eas build --platform android --profile production

# Or local build
npx expo build:android
```

#### iOS (IPA)
```bash
# Configure app.json for iOS
eas build --platform ios --profile production

# Or local build (macOS only)
npx expo build:ios
```

### App Store Submission
1. Create app listings (Google Play, App Store)
2. Prepare screenshots and descriptions
3. Set up pricing and distribution
4. Submit for review

For detailed deployment guide, see Phase 12 documentation (coming soon).

---

## 🔒 Security Considerations

### Implemented Security Features
- ✅ Row Level Security (RLS) on all database tables
- ✅ User authentication with Supabase Auth
- ✅ Session management with secure tokens
- ✅ Password validation and hashing
- ✅ Avatar uploads scoped to user folders
- ✅ Input validation on all forms
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React Native sanitization)

### Best Practices
- Never commit `.env` file
- Use environment variables for secrets
- Validate all user inputs
- Use RLS policies for data access control
- Implement password strength requirements
- Use HTTPS for all API calls (Supabase default)

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Failed to load transactions"
**Solution**:
- Check database schema is set up
- Verify categories table exists
- Check RLS policies allow SELECT
- Ensure user is authenticated

#### 2. "Failed to upload avatar"
**Solution**:
- Verify avatars bucket exists in Supabase Storage
- Check RLS policies on storage.objects
- Ensure expo-image-picker is installed

#### 3. "Charts not displaying"
**Solution**:
- Verify react-native-chart-kit is installed
- Check that data is not empty
- Ensure screen width calculation is correct

#### 4. "Categories not appearing"
**Solution**:
- Complete onboarding flow
- Verify migration 002 ran successfully
- Check RLS policies
- Pull to refresh

#### 5. Expo start fails
**Solution**:
```bash
# Clear cache
npx expo start --clear

# Reinstall dependencies
rm -rf node_modules
npm install

# Reset Metro bundler
npx react-native start --reset-cache
```

### Database Connection Issues
```bash
# Test database connection
node test-database.js

# Re-run migrations
# Go to Supabase SQL Editor and run migrations manually
```

### Need Help?
- Check documentation in `docs/` and phase completion files
- Review `CLAUDE.md` for development guidelines
- See `supabase/README.md` for database setup
- Open an issue on GitHub

---

## 📖 Documentation

### Phase Completion Documents
Detailed documentation for each phase:
- `PHASE4_COMPLETE.md` - Transactions
- `PHASE5_COMPLETE.md` - Categories
- `PHASE6_COMPLETE.md` - Budgets
- `PHASE7_COMPLETE.md` - Goals
- `PHASE8_COMPLETE.md` - Analysis
- `PHASE9_COMPLETE.md` - Profile & Settings
- `PHASE10_COMPLETE.md` - UI/UX Polish

### Developer Guides
- `CLAUDE.md` - Development guidelines for AI assistance
- `supabase/README.md` - Database setup instructions
- `SETUP_DATABASE.md` - Database configuration guide
- `QUICKSTART_DATABASE.md` - Quick database setup

### Product Documentation
- `docs/Product Requirement Document.txt` - Complete feature specifications

---

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Run type checking (`npx tsc --noEmit`)
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Code Style
- Use TypeScript for all new files
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Use functional components with hooks
- Keep components small and focused

### Testing Requirements
- Test on both iOS and Android
- Verify all CRUD operations
- Check edge cases (empty states, errors)
- Ensure responsive design

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| **Development Status** | ✅ Production Ready |
| **Total Screens** | 30+ |
| **Total Components** | 50+ |
| **Database Tables** | 8 (profiles, categories, transactions, budgets, goals, allocations, pending, analytics) |
| **Database Migrations** | 14 |
| **Edge Functions** | 3 (chat-gemini, parse-transaction, receive-bank-transaction) |
| **Zustand Stores** | 4 (auth, chat, theme, pending) |
| **Services** | 4 (supabase, AI, analytics, goal allocations) |
| **Default Categories** | 17 (5 income, 12 expense) |
| **Supported Currencies** | 10 |
| **Supported Languages** | 8 |
| **AI Models** | Google Gemini 2.0 Flash |
| **Lines of Code** | ~20,000+ |

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- Backend powered by [Supabase](https://supabase.com)
- UI components from [React Native Paper](https://reactnativepaper.com)
- Charts by [React Native Chart Kit](https://github.com/indiespirit/react-native-chart-kit)
- Icons from emoji library
- Inspired by Money Lover, Money Helper, and similar finance apps

---

## 🏦 Bank Simulator

The project includes a standalone bank transaction simulator for testing the pending transactions feature.

**Location**: `bank-simulator/index.html`

### How to Use

1. Open `bank-simulator/index.html` in a web browser
2. Configure settings:
   - **User ID**: Your Supabase user ID
   - **Webhook URL**: Your `receive-bank-transaction` Edge Function URL
   - **Bank**: Select bank (BIDV, VietcomBank, Techcombank, VPBank)
3. Customize transaction details:
   - Amount, type (income/expense)
   - Description
   - Transaction time
4. Click "Send Transaction"
5. The app will receive the notification in real-time
6. Review and confirm/reject in the Pending Transactions screen

### Features
- Simulates SMS bank notifications
- Multiple bank formats supported
- Real-time delivery via Edge Function
- Automatic parsing with AI
- Testing without real bank integration

---

## 📞 Support

For issues, questions, or feedback:
- Review documentation in `docs/` folder:
  - `CHATBOT_FEATURE.md` - Chat implementation
  - `CHATBOT_FINANCIAL_ADVISOR_GUIDE.md` - Financial advisor
  - `PERSONALIZATION_FEATURE.md` - User personalization
  - `FINANCIAL_ANALYTICS_README.md` - Analytics system
  - `GOAL_ALLOCATION_IMPLEMENTATION_PLAN.md` - Goal allocations
- Consult `CLAUDE.md` for development help
- Check `supabase/README.md` for database setup
- Open an issue on GitHub

---

## 🔮 Future Enhancements

### Potential Features (Beyond Phase 12)
- **Advanced Analytics**:
  - Custom date range selector
  - Comparative analysis (month-over-month, year-over-year)
  - Budget vs actual overlay charts
  - AI-powered insights and recommendations

- **Data Management**:
  - Export to CSV/PDF
  - Import from other finance apps
  - Data backup and restore
  - Cloud sync across devices

- **Notifications**:
  - Push notifications for budget alerts
  - Goal milestone notifications
  - Reminder notifications

- **Social Features**:
  - Shared budgets (family/household)
  - Goal sharing with friends
  - Community challenges

- **Advanced Security**:
  - Biometric authentication (fingerprint/face ID)
  - Two-factor authentication
  - Session management
  - Login history

- **Integrations**:
  - Bank account linking (Plaid, etc.)
  - Receipt scanning (OCR)
  - Cryptocurrency tracking
  - Investment portfolio tracking

- **Gamification**:
  - Achievement badges
  - Streak tracking
  - Leaderboards
  - Rewards system

---

**Version**: 1.0.0
**Last Updated**: December 12, 2025
**Status**: ✅ **Production Ready**

**Key Features**:
- 🤖 AI-powered transaction parsing and financial advice
- 📱 Pending transactions from bank notifications
- 💰 Goal allocation system with balance tracking
- 📊 Pre-calculated analytics for instant insights
- 🌙 Dark mode and theme customization
- 🌍 Multi-currency and multi-language support

🎉 **Ready for testing and deployment!**

---

*For detailed setup instructions, see the [Getting Started](#-getting-started) section above.*
