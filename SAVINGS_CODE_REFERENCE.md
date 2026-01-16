# Savings Transactions Migration - Code Reference Guide

## Key Pattern: Yield Calculation for Interest Transactions

### The Calculation Logic
```typescript
// In useSavingsData.ts - addSavingsTransaction()

// 1. Get previous balance (all transactions BEFORE this date)
const previousBalance = await calculatePreviousSavingsBalance(
  transaction.savings_account_id, 
  transaction.date
);

// 2. Calculate yield as percentage ONLY for interest type
let calculatedYield: number | null = null;
if (transaction.type === 'interest' && previousBalance > 0) {
  calculatedYield = (Number(transaction.amount) / previousBalance) * 100;
} else if (transaction.type === 'interest' && previousBalance === 0) {
  // Edge case: no prior balance, yield is 0 (can't divide by 0)
  calculatedYield = 0;
}
// For deposits/withdrawals: calculatedYield stays null

// 3. Calculate balance after transaction
const balanceChange = (transaction.type === 'withdrawal') 
  ? -Number(transaction.amount) 
  : Number(transaction.amount);
const newBalance = (account?.balance || 0) + balanceChange;

// 4. Insert into savings_transactions with yield data
const { data: insertData } = await supabase
  .from('savings_transactions')
  .insert({
    user_id: user.id,
    savings_account_id: transaction.savings_account_id,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description || undefined,
    date: transaction.date,
    calculated_yield: calculatedYield,           // NEW
    balance_after_transaction: newBalance,       // NEW
  })
  .select()
  .single();
```

### Helper Function: calculatePreviousSavingsBalance()
```typescript
const calculatePreviousSavingsBalance = useCallback(
  async (accountId: string, beforeDate: string): Promise<number> => {
    if (!user) return 0;

    // Get all transactions BEFORE this date, ordered by date
    const { data: priorTxs } = await supabase
      .from('savings_transactions')
      .select('type, amount')
      .eq('savings_account_id', accountId)
      .eq('user_id', user.id)
      .lt('date', beforeDate)  // CRITICAL: only before this transaction
      .order('date', { ascending: true });

    if (!priorTxs) return 0;

    // Accumulate: deposits/interest add, withdrawals subtract
    return priorTxs.reduce((balance, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'withdrawal') return balance - amount;
      return balance + amount; // deposit or interest
    }, 0);
  }, 
  [user]
);
```

## Table Structure After Migration

### Before: Using transactions table
```typescript
// In transactions table
{
  id: 'tx-123',
  user_id: 'user-456',
  payment_method_id: 'pm-789',  // Points to payment_methods ID
  type: 'income',               // Mapped type: income/expense
  category: 'Intereses',        // Text string category
  amount: 300,
  description: 'Monthly interest',
  date: '2025-01-15',
  calculated_yield_amount: 30,  // Old yield system
  balance_at_transaction: 3000,  // Old balance tracking
}
```

### After: Using savings_transactions table
```typescript
// In savings_transactions table (dedicated table)
{
  id: 'st-123',
  user_id: 'user-456',
  savings_account_id: 'pm-789',  // Direct reference to savings account
  type: 'interest',              // Typed field: deposit/withdrawal/interest
  amount: 300,
  description: 'Monthly interest',
  date: '2025-01-15',
  calculated_yield: 10.5,        // NEW: Percentage (300/2857 * 100)
  balance_after_transaction: 3150 // NEW: Exact balance after this tx
}
```

## Data Flow Example

### Scenario: Adding interest to savings account
```
Initial state:
- Account balance: $2,500
- Previous transactions: [Deposit $1,000, Deposit $1,500]

User adds: Interest $250 on 2025-01-20

Step 1: Calculate previous balance
  - Query all transactions BEFORE 2025-01-20
  - Sum: $1,000 + $1,500 = $2,500 ✓

Step 2: Calculate yield
  - yield = ($250 / $2,500) * 100 = 10%

Step 3: Calculate new balance
  - new_balance = $2,500 + $250 = $2,750

Step 4: Insert to savings_transactions
  {
    savings_account_id: 'pm-123',
    type: 'interest',
    amount: 250,
    date: '2025-01-20',
    calculated_yield: 10,          // Stored as percentage
    balance_after_transaction: 2750 // For reference/analytics
  }

Step 5: Update payment_methods.balance
  - UPDATE payment_methods SET balance = 2750 WHERE id = 'pm-123'

Result in UI:
  | 2025-01-20 | Monthly interest | Interés | Savings Acc | +$250 | 10.0% |
```

## UI Display Logic (SavingsPerformance.tsx)

### Displaying Yield in Transaction Table
```tsx
{/* Yield/Rendimiento */}
<td className="py-2.5 px-3 align-middle text-right">
  <span className="text-xs font-semibold tabular-nums" style={{ fontStyle: 'normal' }}>
    {tx.type === 'interest' && tx.calculated_yield !== null && tx.calculated_yield !== undefined
      ? `${tx.calculated_yield.toFixed(2)}%`
      : '0.0%'}
  </span>
</td>
```

Display rules:
- **Interest transactions**: Show `calculated_yield` as percentage
- **Deposits/Withdrawals**: Show "0.0%"
- **Format**: X.XX% (2 decimal places)
- **Style**: No italics (`font-style: normal` enforced)

## Database Query Patterns

### Pattern 1: Fetch all savings transactions for an account
```typescript
const { data } = await supabase
  .from('savings_transactions')
  .select('*')
  .eq('user_id', user.id)
  .eq('savings_account_id', accountId)
  .order('date', { ascending: false });
```

### Pattern 2: Calculate account balance from transactions
```typescript
const { data: txs } = await supabase
  .from('savings_transactions')
  .select('type, amount')
  .eq('savings_account_id', accountId)
  .eq('user_id', user.id)
  .order('date', { ascending: true });

const currentBalance = txs.reduce((sum, tx) => {
  if (tx.type === 'withdrawal') return sum - tx.amount;
  return sum + tx.amount;
}, 0);
```

### Pattern 3: Get balance at specific date
```typescript
const { data: txs } = await supabase
  .from('savings_transactions')
  .select('type, amount')
  .eq('savings_account_id', accountId)
  .eq('user_id', user.id)
  .lte('date', specificDate)  // At or before date
  .order('date', { ascending: true });

const balanceAtDate = txs.reduce((sum, tx) => {
  if (tx.type === 'withdrawal') return sum - tx.amount;
  return sum + tx.amount;
}, 0);
```

## Error Handling Patterns

### Insufficient Balance Check
```typescript
const account = savingsAccounts.find(a => a.id === transaction.savings_account_id);
if (account && transaction.type === 'withdrawal' && account.balance < transaction.amount) {
  toast({
    title: 'Error: Saldo insuficiente',
    description: 'El gasto es mayor al dinero disponible',
    variant: 'destructive',
  });
  return { error: 'Saldo insuficiente' };
}
```

### Consistency Check After Update
```typescript
// After updating transaction, verify payment_methods balance
const { data: allTxs } = await supabase
  .from('savings_transactions')
  .select('type, amount')
  .eq('savings_account_id', accountId)
  .eq('user_id', user.id);

const calculatedBalance = allTxs.reduce((sum, tx) => {
  if (tx.type === 'withdrawal') return sum - tx.amount;
  return sum + tx.amount;
}, 0);

// Should match payment_methods.balance
console.assert(calculatedBalance === account.balance, 'Balance mismatch!');
```

## Type Safety

### SavingsTransaction Interface
```typescript
export interface SavingsTransaction {
  id: string;                              // UUID from database
  savings_account_id: string;              // Foreign key to payment_methods
  type: 'deposit' | 'withdrawal' | 'interest';  // Strict type
  amount: number;                          // Transaction amount
  date: string;                            // ISO date string (YYYY-MM-DD)
  description?: string;                    // Optional description
  category?: string;                       // Optional category label
  calculated_yield?: number | null;        // NEW: Percentage (null if not interest)
  balance_after_transaction?: number | null; // NEW: Balance after this tx
  raw?: any;                               // Keep raw DB row for reference
}
```

## Performance Optimization Tips

### For Large Account Histories (1000+ transactions)

Add database index:
```sql
CREATE INDEX idx_savings_transactions_date 
ON savings_transactions(savings_account_id, date);
```

Optimize balance calculations with pagination:
```typescript
// Instead of fetching all transactions
const { data: txs } = await supabase
  .from('savings_transactions')
  .select('*')
  .eq('savings_account_id', accountId)
  .order('date', { ascending: false })
  .limit(100);  // Only recent transactions
```

### Caching Previous Balance
```typescript
// Cache within component lifecycle
const previousBalanceCache = useRef<{ [key: string]: number }>({});

const getPreviousBalance = useCallback(async (accountId: string, beforeDate: string) => {
  const key = `${accountId}-${beforeDate}`;
  if (previousBalanceCache.current[key] !== undefined) {
    return previousBalanceCache.current[key];
  }
  
  const balance = await calculatePreviousSavingsBalance(accountId, beforeDate);
  previousBalanceCache.current[key] = balance;
  return balance;
}, []);
```

## Debugging Tips

### Verify Yield Calculation
```typescript
// In browser console
const tx = { amount: 250, previous_balance: 2500 };
const yield_percent = (tx.amount / tx.previous_balance) * 100;
console.log(`Yield: ${yield_percent}%`); // Should be 10%
```

### Check Balance Consistency
```typescript
// Verify each transaction's balance_after_transaction is correct
let runningBalance = 0;
transactions.forEach(tx => {
  if (tx.type === 'withdrawal') runningBalance -= tx.amount;
  else runningBalance += tx.amount;
  
  console.assert(
    runningBalance === tx.balance_after_transaction,
    `Balance mismatch at ${tx.date}: calculated ${runningBalance}, got ${tx.balance_after_transaction}`
  );
});
```

### Monitor API Calls
```typescript
// Add logging to catch async issues
const addSavingsTransaction = async (transaction) => {
  console.time('add-savings-tx');
  
  const previousBalance = await calculatePreviousSavingsBalance(
    transaction.savings_account_id,
    transaction.date
  );
  console.log('Previous balance:', previousBalance);
  
  const yield = (transaction.amount / previousBalance) * 100;
  console.log('Calculated yield:', yield);
  
  // ... rest of function
  
  console.timeEnd('add-savings-tx');
};
```
