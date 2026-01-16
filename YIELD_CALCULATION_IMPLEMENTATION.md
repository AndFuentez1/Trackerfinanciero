# Yield Calculation Implementation - Summary

## Overview
Implemented a precise yield calculation system for the Savings section that tracks interest/rendimiento transactions with the accumulated balance at the moment the interest was recorded.

## Changes Made

### 1. Database Layer (SQL Migration)
**File**: `supabase/migrations/20260115_add_yield_tracking_columns.sql`

Added two new columns to the `transactions` table:
- `calculated_yield_amount DECIMAL(15,2)` - Stores the interest/yield amount for interest transactions
- `balance_at_transaction DECIMAL(15,2)` - Stores the total accumulated balance at the moment the interest transaction was recorded

### 2. TypeScript Types
**File**: `src/integrations/supabase/types.ts`

Updated the `transactions` table type definition to include:
```typescript
Row: {
  // ... existing fields
  calculated_yield_amount: number | null;
  balance_at_transaction: number | null;
}
```

**File**: `src/hooks/useFinanceData.ts`

Updated the `Transaction` interface:
```typescript
export interface Transaction {
  // ... existing fields
  calculated_yield_amount?: number | null;
  balance_at_transaction?: number | null;
}
```

### 3. Calculation Logic
**File**: `src/hooks/useFinanceData.ts`

#### Added Helper Function: `calculateBalanceAtTransaction()`
```typescript
const calculateBalanceAtTransaction = async (paymentMethodId: string): Promise<number> => {
  // Fetches all transactions for a payment method
  // Calculates total accumulated balance (sum of deposits + previous interests)
  // Returns the total balance at the current moment
}
```

**Logic**:
- Sums all `income` and `transfer_in` transactions (deposits)
- Subtracts all `expense` and `transfer_out` transactions (withdrawals)
- Returns the net accumulated balance

#### Modified `addTransaction()` Function
When creating a transaction:

1. **For Interest/Yield Transactions** (detected by category 'Rendimientos' or description containing 'interés', 'intereses', 'rendimiento'):
   - Calls `calculateBalanceAtTransaction()` to get the balance before this interest
   - Stores the calculated balance in `balance_at_transaction`
   - Stores the interest amount in `calculated_yield_amount`
   - Saves both values to the database

2. **For Deposit Transactions** ('Depósito' type):
   - `calculated_yield_amount` remains NULL
   - `balance_at_transaction` remains NULL
   - Only the payment method balance is updated

### 4. Yield Statistics
**File**: `src/hooks/useFinanceData.ts`

Added a new `yieldStatistics` useMemo that calculates:
```typescript
{
  totalYield: number,          // Sum of all calculated yields
  yieldCount: number,          // Number of yield transactions
  averageYield: number,        // Average yield per transaction
  yieldByPaymentMethod: {      // Yields grouped by payment method ID
    [paymentMethodId]: totalYield
  },
  yieldTransactions: Transaction[] // Array of all yield transactions
}
```

This is exported in the `useFinanceData()` hook return value for use in components.

## How It Works

### Transaction Recording Flow

1. **User adds an Interest transaction** for a savings account with amount $500,000

2. **System calculates**:
   - Retrieves all previous transactions for that account
   - Previous deposits: $1,000,000
   - Previous interests: $50,000
   - **Balance at transaction**: $1,050,000

3. **System stores**:
   - `calculated_yield_amount`: 500,000 (the interest amount)
   - `balance_at_transaction`: 1,050,000 (balance before this interest)
   - Updates account balance to: $1,550,000

### Example Data Structure
```
Transaction 1: Depósito (Deposit)
  amount: 1,000,000
  calculated_yield_amount: null
  balance_at_transaction: null
  payment_method_id: savings_acc_1

Transaction 2: Rendimiento (Interest)
  amount: 50,000
  calculated_yield_amount: 50,000 ✓
  balance_at_transaction: 1,000,000 ✓
  payment_method_id: savings_acc_1

Transaction 3: Rendimiento (Interest)
  amount: 500,000
  calculated_yield_amount: 500,000 ✓
  balance_at_transaction: 1,050,000 ✓
  payment_method_id: savings_acc_1
```

## Usage in Components

### Access Yield Data via useFinanceData Hook

```typescript
const { yieldStatistics, transactions } = useFinanceData();

// Get total yield
console.log(yieldStatistics.totalYield); // 550,000

// Get average yield
console.log(yieldStatistics.averageYield); // 275,000

// Get yields by account
const savingsAccId = 'savings_123';
console.log(yieldStatistics.yieldByPaymentMethod[savingsAccId]); // 550,000

// Access individual transaction details
const yieldTxn = yieldStatistics.yieldTransactions[0];
console.log(yieldTxn.balance_at_transaction); // 1,000,000
console.log(yieldTxn.calculated_yield_amount); // 50,000
```

### Display in History/Transactions

Transaction rows can now access:
```typescript
transaction.calculated_yield_amount // Shows yield amount if interest transaction
transaction.balance_at_transaction  // Shows account balance at interest date
```

## Benefits

1. **Precise Tracking**: Yields are calculated at the exact moment of recording, not estimated
2. **Audit Trail**: `balance_at_transaction` provides historical balance snapshots
3. **Reporting**: Easy to generate yield reports by account using `yieldByPaymentMethod`
4. **Consistency**: Interest transactions are automatically identified and processed
5. **Flexibility**: Deposits don't trigger yield calculations; only interest transactions do

## Future Enhancements

Potential features that can leverage this data:
- Yield performance reports by account
- ROI calculations (yield % = calculated_yield / balance_at_transaction * 100)
- Yield trend visualization
- Annual yield summary
- Comparison of actual vs estimated yield rates
- Alert system for yield rate changes

## Migration Notes

To apply the database changes:

1. Run the migration on the Supabase project:
   ```sql
   ALTER TABLE transactions 
   ADD COLUMN IF NOT EXISTS calculated_yield_amount DECIMAL(15,2) DEFAULT 0,
   ADD COLUMN IF NOT EXISTS balance_at_transaction DECIMAL(15,2) DEFAULT 0;
   ```

2. The hook will automatically populate these fields for new interest transactions
3. Existing transactions will have NULL values for these new columns (can be backfilled if needed)
4. TypeScript types have already been updated to reflect these columns
