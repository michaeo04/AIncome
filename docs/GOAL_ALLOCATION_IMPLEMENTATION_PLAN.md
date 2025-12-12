# Goal Allocation System - Implementation Plan

## Overview

This document outlines the complete implementation plan for the new Goal Allocation System in the AIncome app.

### Key Changes from Original Design

**Original System:**
- Goal progress tracked by Net Balance accumulation since start date
- Progress = (Total Income - Total Expense) from start date
- No explicit allocation mechanism

**New System:**
- Users explicitly allocate money from Net Balance to goals
- Allocated money is tracked but doesn't change displayed balance
- Virtual balance concept: `Available Balance = Net Balance - Allocated Balance`
- Spending warnings when Net Balance < Total Allocations

---

## Database Changes

### ✅ COMPLETED: Migration File Created

**File:** `supabase/migrations/008_goal_allocations_system.sql`

**Changes:**
1. **`saving_goals` table** - Added `allocated_amount` column
2. **`goal_allocations` table** - New table for tracking allocation history
3. **Database Functions:**
   - `get_user_net_balance(user_id)` - Calculate net balance
   - `get_total_allocated_balance(user_id)` - Sum of all allocations
   - `get_available_balance(user_id)` - Returns breakdown
   - `can_allocate_to_goal(user_id, goal_id, amount)` - Validation
   - `allocate_to_goal(...)` - Deposit to goal
   - `withdraw_from_goal(...)` - Withdraw from goal
4. **View:** `goal_progress_view` - Shows goals with allocation progress
5. **Trigger:** Auto-complete goal when allocated >= target

### Migration Deployment

**Run in Supabase Dashboard:**
```bash
# In Supabase SQL Editor, execute:
008_goal_allocations_system.sql
```

---

## TypeScript Types

### ✅ COMPLETED: Types Updated

**File:** `src/types/index.ts`

**Added Types:**
```typescript
// Updated SavingGoal interface
export interface SavingGoal {
  allocated_amount: number; // NEW
  // ... existing fields
}

// New types
export interface GoalAllocation {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  note?: string;
  created_at: string;
}

export interface AvailableBalance {
  net_balance: number;
  allocated_balance: number;
  available_balance: number;
}

export interface GoalProgressView {
  // Complete goal data with progress calculations
}
```

---

## Service Layer

### ✅ COMPLETED: Goal Allocation Service

**File:** `src/services/goalAllocationService.ts`

**Functions:**
- `getAvailableBalance(userId)` - Get balance breakdown
- `getGoalsWithProgress(userId)` - Fetch goals from view
- `getGoalAllocations(goalId)` - Get allocation history
- `canAllocateToGoal(userId, goalId, amount)` - Validate
- `allocateToGoal(userId, goalId, amount, note?)` - Deposit
- `withdrawFromGoal(userId, goalId, amount, note?)` - Withdraw
- `createSavingGoal(...)` - Create new goal
- `updateSavingGoal(...)` - Update goal details
- `deleteSavingGoal(goalId)` - Delete (only if allocated = 0)
- `archiveGoal(goalId)` - Archive goal
- `checkSpendingWarning(userId, expenseAmount)` - Check warnings

---

## UI Components Needed

### 1. Updated Budget Screen Structure

**Current:** Budget Screen shows only budgets
**New:** Budget Screen with Tabs: "Budgets" and "Savings Goals"

```
┌─────────────────────────────────────┐
│  💳 Budgets & Goals                 │
│  ┌─────────┬─────────────┐          │
│  │ Budgets │ Savings     │ ← Tabs  │
│  └─────────┴─────────────┘          │
├─────────────────────────────────────┤
│  [Active Tab Content]               │
│                                     │
│  Budget Tab:                        │
│  - Existing budget list             │
│  - Budget cards                     │
│  - Add budget button                │
│                                     │
│  Savings Tab:                       │
│  - Balance card (new)               │
│  - Goals list (new)                 │
│  - Add goal button                  │
└─────────────────────────────────────┘
```

### 2. Balance Overview Card (for Savings Tab)

Shows Available Balance breakdown:

```
┌─────────────────────────────────────┐
│  💰 Your Balance                    │
├─────────────────────────────────────┤
│  Net Balance                        │
│  ₫ 50,000,000          [Total]     │
├─────────────────────────────────────┤
│  Allocated to Goals                 │
│  ₫ 30,000,000          [Locked]    │
├─────────────────────────────────────┤
│  Available Balance                  │
│  ₫ 20,000,000          [Free]      │
└─────────────────────────────────────┘
```

### 3. Goal Card Component

Shows goal with allocation controls:

```
┌─────────────────────────────────────┐
│  🏠 New Laptop                      │
│  ₫ 15,000,000 / ₫ 20,000,000       │
│  ████████░░  75%                    │
│  ₫ 5,000,000 remaining              │
│  [➕ Allocate] [➖ Withdraw]        │
└─────────────────────────────────────┘
```

### 4. Allocation Modal

Bottom sheet for allocating/withdrawing money:

```
┌─────────────────────────────────────┐
│  Transfer to: 🏠 New Laptop         │
├─────────────────────────────────────┤
│  Available: ₫ 20,000,000            │
│  Goal: ₫ 15,000,000 / ₫ 20,000,000 │
├─────────────────────────────────────┤
│  Amount:                            │
│  ┌───────────────────────────────┐  │
│  │ ₫ 5,000,000                   │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Quick] [₫1M] [₫2M] [₫5M] [All]  │
│                                     │
│  Note (optional):                   │
│  ┌───────────────────────────────┐  │
│  │ Monthly savings                │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Cancel]  [Transfer ₫5,000,000]   │
└─────────────────────────────────────┘
```

### 5. Spending Warning Modal

Appears when adding expense that would cause deficit:

```
┌─────────────────────────────────────┐
│  ⚠️ Warning: Low Available Balance  │
├─────────────────────────────────────┤
│  This expense will reduce your net  │
│  balance below your goal allocations│
│                                     │
│  Net Balance After: ₫ 25,000,000    │
│  Total Allocated: ₫ 30,000,000      │
│  Deficit: ₫ 5,000,000               │
│                                     │
│  You may want to withdraw from      │
│  goals before recording this expense│
│                                     │
│  [Go to Goals] [Continue Anyway]    │
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Database & Backend ✅ DONE
- [x] Create migration file
- [x] Define TypeScript types
- [x] Create service functions

### Phase 2: UI Components (IN PROGRESS)
- [ ] Create `GoalAllocationCard` component
- [ ] Create `BalanceOverviewCard` component
- [ ] Create `AllocationModal` component
- [ ] Create `SpendingWarningModal` component
- [ ] Update `BudgetScreen` with tabs
- [ ] Create `SavingsGoalsTab` component

### Phase 3: Integration
- [ ] Update `AddGoalScreen` to use new system
- [ ] Update transaction creation to check spending warnings
- [ ] Update home screen balance display
- [ ] Test all allocation flows

### Phase 4: Testing
- [ ] Test allocation validation
- [ ] Test spending warnings
- [ ] Test goal completion
- [ ] Test edge cases (negative balance, etc.)

---

## File Structure

```
src/
├── components/
│   └── goals/                    [NEW]
│       ├── GoalAllocationCard.tsx
│       ├── BalanceOverviewCard.tsx
│       ├── AllocationModal.tsx
│       └── SpendingWarningModal.tsx
├── screens/
│   ├── budget/
│   │   ├── BudgetScreen.tsx     [UPDATE - Add tabs]
│   │   └── SavingsGoalsTab.tsx   [NEW]
│   └── goals/
│       ├── AddGoalScreen.tsx     [UPDATE - New system]
│       └── GoalDetailScreen.tsx  [UPDATE - Show allocations]
├── services/
│   └── goalAllocationService.ts  [NEW] ✅
└── types/
    └── index.ts                  [UPDATE] ✅
```

---

## User Flow Examples

### Flow 1: Create Goal and Allocate Money

1. User goes to Budget tab → Savings Goals
2. Sees balance overview (Net: ₫50M, Allocated: ₫0, Available: ₫50M)
3. Taps "Create Goal" → Creates "New Laptop ₫20M"
4. Goal appears with ₫0/₫20M (0%)
5. Taps "Allocate" → Enters ₫10M
6. Balance updates (Net: ₫50M, Allocated: ₫10M, Available: ₫40M)
7. Goal shows ₫10M/₫20M (50%)

### Flow 2: Spending Warning

1. User has Net Balance: ₫30M, Allocated: ₫25M, Available: ₫5M
2. User tries to add expense: ₫10M
3. System calculates: Net after = ₫20M < Allocated ₫25M
4. Warning modal appears showing ₫5M deficit
5. User can either:
   - Cancel and withdraw from goals first
   - Continue anyway (allowed but warned)

### Flow 3: Withdraw from Goal

1. User in Savings Goals tab
2. Goal shows ₫15M/₫20M allocated
3. Taps "Withdraw" → Enters ₫5M
4. Balance updates (Allocated decreases by ₫5M)
5. Goal shows ₫10M/₫20M

---

## Technical Notes

### Balance Calculation Priority

```typescript
Net Balance = SUM(transactions WHERE type='income') - SUM(transactions WHERE type='expense')
Allocated Balance = SUM(saving_goals.allocated_amount WHERE status='active')
Available Balance = Net Balance - Allocated Balance
```

### Important Rules

1. **Can allocate only if:** `amount <= Available Balance`
2. **Can withdraw only if:** `amount <= Goal.allocated_amount`
3. **Show warning if:** `(Net Balance - new_expense) < Allocated Balance`
4. **Cannot delete goal if:** `allocated_amount > 0`
5. **Auto-complete goal if:** `allocated_amount >= target_amount`

### Edge Cases to Handle

1. **Negative Net Balance:** Can still have allocations, but available = negative
2. **Over-allocated:** If user spends after allocating, available becomes negative
3. **Goal completion:** Auto-mark as completed, but still allow withdraw
4. **Archived goals:** Don't count toward allocated_balance
5. **Multiple simultaneous allocations:** Database handles with transactions

---

## Testing Checklist

### Unit Tests
- [ ] Balance calculations
- [ ] Allocation validation
- [ ] Spending warning logic

### Integration Tests
- [ ] Create goal → Allocate → Withdraw → Delete
- [ ] Multiple goals with overlapping allocations
- [ ] Spending with various balance scenarios
- [ ] Goal auto-completion

### UI Tests
- [ ] Tab switching
- [ ] Modal interactions
- [ ] Balance display updates
- [ ] Warning modal appears correctly

---

## Migration Rollout Plan

### Step 1: Database Migration
```sql
-- Run in Supabase dashboard
-- File: 008_goal_allocations_system.sql
```

### Step 2: Backfill Existing Data
```sql
-- If there are existing goals, set allocated_amount = 0
UPDATE saving_goals SET allocated_amount = 0 WHERE allocated_amount IS NULL;
```

### Step 3: Deploy Code
- Deploy service layer first
- Deploy UI components
- Test with real users

### Step 4: User Communication
- Notify users about new allocation feature
- Provide tutorial/guide
- Explain difference from old tracking system

---

## Next Steps

1. Review this plan
2. Run database migration
3. Start implementing UI components
4. Test each component individually
5. Integrate into app
6. Full end-to-end testing

