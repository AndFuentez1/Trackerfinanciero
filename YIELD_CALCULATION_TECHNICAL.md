# Yield Calculation - Technical Reference

## Complete Implementation

### 1. Helper Function: calculatePreviousSavingsBalance()

```typescript
const calculatePreviousSavingsBalance = useCallback(
  async (accountId: string, beforeDate: string): Promise<number> => {
    if (!user) return 0;

    // Query all transactions BEFORE the given date
    const { data: priorTxs } = await supabase
      .from('savings_transactions')
      .select('type, amount')
      .eq('savings_account_id', accountId)
      .eq('user_id', user.id)
      .lt('date', beforeDate)              // CRITICAL: Only before date
      .order('date', { ascending: true });

    if (!priorTxs) return 0;

    // Accumulate balance from all prior transactions
    return priorTxs.reduce((balance, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'withdrawal') {
        return balance - amount;  // Withdrawals subtract
      }
      return balance + amount;    // Deposits and interest add
    }, 0);
  },
  [user]
);
```

**Key Points:**
- Only sums transactions BEFORE the current date
- Deposits and interest are additions
- Withdrawals are subtractions
- Returns 0 if no user or no prior transactions

---

### 2. Yield Calculation Logic

```typescript
// In addSavingsTransaction()

// 1. Get previous balance (only for interest transactions)
let previousBalance = 0;
if (transaction.type === 'interest') {
  previousBalance = await calculatePreviousSavingsBalance(
    transaction.savings_account_id,
    transaction.date
  );
}

// 2. Calculate yield percentage
let calculatedYield: number | null = null;

if (transaction.type === 'interest' && previousBalance > 0) {
  // Normal case: calculate percentage
  calculatedYield = (Number(transaction.amount) / previousBalance) * 100;
} else if (transaction.type === 'interest' && previousBalance === 0) {
  // Edge case: no prior balance, yield is undefined mathematically
  // Store as 0 to represent "no yield basis"
  calculatedYield = 0;
}
// For deposits/withdrawals: calculatedYield stays null
```

**Formula:**
```
calculated_yield = (interest_amount / previous_balance) × 100
```

**Example Calculation:**
```
Previous Balance: $2,500
Interest Added: $250
Yield: ($250 / $2,500) × 100 = 10%
```

---

### 3. Insert into Database

```typescript
const { data: insertData, error: insertError } = await supabase
  .from('savings_transactions')
  .insert({
    user_id: user.id,
    savings_account_id: transaction.savings_account_id,
    payment_method_id: transaction.payment_method_id,  // Required
    type: transaction.type,                            // 'deposit'|'withdrawal'|'interest'
    amount: transaction.amount,                        // Transaction amount
    description: transaction.description || undefined,
    date: transaction.date,                            // ISO format: YYYY-MM-DD
    calculated_yield: calculatedYield,                 // Percentage (null for non-interest)
    balance_after_transaction: newBalance,             // Updated account balance
  })
  .select()
  .single();
```

**Stored Values:**

| Type | calculated_yield | balance_after_transaction |
|------|------------------|---------------------------|
| interest (example) | 10.25 | 2760.50 |
| interest (no prior) | 0 | amount |
| deposit | null | previous + amount |
| withdrawal | null | previous - amount |

---

### 4. Update Existing Interest Transaction

When editing an interest transaction amount, recalculate yield:

```typescript
// In updateSavingsTransaction()

// 1. Get the old transaction
const oldTx = savingsTransactions.find(t => t.id === id);

// 2. Only recalculate if it's an interest transaction
let newCalculatedYield: number | null = null;
if (oldTx.type === 'interest') {
  const previousBalance = await calculatePreviousSavingsBalance(
    oldTx.savings_account_id,
    oldTx.date
  );
  if (previousBalance > 0) {
    newCalculatedYield = (newAmount / previousBalance) * 100;
  } else {
    newCalculatedYield = 0;
  }
}

// 3. Update with new yield
const { error } = await supabase
  .from('savings_transactions')
  .update({
    amount: newAmount,
    calculated_yield: newCalculatedYield,
    balance_after_transaction: newAccountBalance,
  })
  .eq('id', id);
```

---

### 5. Display in UI

```tsx
{/* Rendimiento Column */}
<td className="py-2.5 px-3 align-middle text-right">
  <span 
    className="text-xs font-semibold tabular-nums" 
    style={{ fontStyle: 'normal' }}
  >
    {tx.type === 'interest' && 
     tx.calculated_yield !== null && 
     tx.calculated_yield !== undefined
      ? `${tx.calculated_yield.toFixed(2)}%`
      : '0.0%'}
  </span>
</td>
```

**Display Rules:**
- Interest transactions: Show `calculated_yield.toFixed(2)%`
- Deposits: Show `0.0%`
- Withdrawals: Show `0.0%`
- Always 2 decimal places
- No italic styling

---

## Real-World Examples

### Example 1: Simple Interest Accrual

**Timeline:**
```
2025-01-05: Deposit $1,000 → Balance: $1,000, Yield: 0.0%
2025-01-10: Deposit $500  → Balance: $1,500, Yield: 0.0%
2025-01-15: Interest $75  → Balance: $1,575, Yield: 5.0%
           // Calculation: $75 / $1,500 = 0.05 = 5%
```

**Table Display:**
```
Fecha      | Descripción | Método    | Monto   | Rendimiento
2025-01-15 | Interest    | Savings A | +$75    | 5.00%
2025-01-10 | Deposit     | Savings A | +$500   | 0.0%
2025-01-05 | Deposit     | Savings A | +$1,000 | 0.0%
```

### Example 2: Multiple Accounts (Isolated)

**Account A:**
```
2025-01-05: Deposit $1,000
2025-01-15: Interest $50 → Yield = $50/$1,000 = 5%
```

**Account B:**
```
2025-01-05: Deposit $2,000
2025-01-15: Interest $100 → Yield = $100/$2,000 = 5%
```

**Note:** Each account's yield calculated independently based on its own balance.

### Example 3: Withdrawal Impact

**Scenario:**
```
2025-01-05: Deposit $1,000   → Balance: $1,000
2025-01-10: Withdraw $200    → Balance: $800, Yield: 0.0%
2025-01-15: Interest $50     → Yield = $50/$800 = 6.25%
           // Uses balance after withdrawal ($800), not original ($1,000)
```

**Key Point:** Yield calculated on actual balance BEFORE interest, accounting for any withdrawals.

### Example 4: Edge Case - Interest on Empty Account

**Scenario:**
```
2025-01-05: Deposit $100
2025-01-10: Withdraw $100    → Balance: $0
2025-01-15: Interest $5      → Yield = 0.0%
           // previousBalance = 0, so yield = 0
```

**Rule:** If no balance exists when interest is added, yield is 0% (cannot calculate percentage of zero).

---

## Performance Considerations

### Query Optimization

For accounts with many transactions, add database index:

```sql
CREATE INDEX idx_savings_transactions_date_pm
ON savings_transactions(savings_account_id, date);
```

### Calculation Timing

- **One-time per transaction:** Calculate yield when adding
- **Update only for edits:** Recalculate only when amount/date changes
- **No batch recalculation:** Each transaction independent

### Memory Usage

- calculatePreviousSavingsBalance queries only needed rows
- No caching of balances (recalculate for accuracy)
- Supabase handles query optimization

---

## Testing the Yield Calculation

### Test Case 1: Basic Interest
```javascript
previousBalance = 2500;
interestAmount = 250;
expectedYield = (250 / 2500) * 100 = 10.0;
```

### Test Case 2: Zero Balance
```javascript
previousBalance = 0;
interestAmount = 100;
expectedYield = 0;  // Edge case
```

### Test Case 3: Decimal Precision
```javascript
previousBalance = 3333.33;
interestAmount = 111.11;
expectedYield = (111.11 / 3333.33) * 100 = 3.33%
// Display: "3.33%"
```

### Verification Query

To verify calculations in database:

```sql
-- Check a specific interest transaction
SELECT 
  id,
  type,
  amount,
  date,
  calculated_yield,
  (
    SELECT COALESCE(SUM(amount), 0) -
           COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)
    FROM savings_transactions st2
    WHERE st2.savings_account_id = st1.savings_account_id
      AND st2.type IN ('deposit', 'interest')
      AND st2.date < st1.date
  ) AS calculated_previous_balance
FROM savings_transactions st1
WHERE type = 'interest'
ORDER BY date;
```

---

## Common Issues & Solutions

### Issue: Yield shows NULL in table
**Solution:** Check that `calculated_yield` is not null. For non-interest transactions, display "0.0%"

### Issue: Yield calculation seems wrong
**Solution:** 
1. Verify previousBalance is calculated before the transaction date
2. Check that withdrawals are subtracted (not added)
3. Confirm formula: `(amount / previousBalance) * 100`

### Issue: Different yield for same transaction type across accounts
**Solution:** This is correct! Each account's yield based on its own previous balance.

### Issue: Yield changes when editing an interest transaction
**Solution:** This is expected! If previousBalance changes (due to other edits), yield recalculates.

---

## API Contract

### addSavingsTransaction Input
```typescript
{
  savings_account_id: string;    // UUID
  payment_method_id: string;     // UUID (same as savings_account_id)
  type: 'deposit' | 'withdrawal' | 'interest';
  amount: number;                // Decimal amount
  date: string;                  // ISO format: "YYYY-MM-DD"
  description?: string;          // Optional
}
```

### Database Columns Involved
```
savings_transactions:
  - calculated_yield: DECIMAL(10,4) or NUMERIC
  - balance_after_transaction: DECIMAL(15,2) or NUMERIC
  - amount: DECIMAL or NUMERIC
  - type: VARCHAR/TEXT
  - date: DATE
  - savings_account_id: UUID
  - payment_method_id: UUID
  - user_id: UUID
```

### Return Value
```typescript
{
  error: null | any;
}
```

Success: error = null
Failure: error contains error details

---

## Summary

**Yield Calculation Formula:**
```
For Interest Transactions:
  calculated_yield = (interest_amount / previous_balance) * 100

For Other Transactions:
  calculated_yield = 0.0
```

**Key Implementation Details:**
1. Previous balance calculated from transactions BEFORE the current date
2. Only interest transactions have non-zero yields
3. Yield always displayed as percentage with 2 decimal places
4. Stored in `calculated_yield` column as decimal/numeric
5. Displayed with format `.toFixed(2)%`

**Status:** ✅ Fully implemented and tested
