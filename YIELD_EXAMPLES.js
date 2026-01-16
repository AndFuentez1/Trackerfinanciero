// YIELD CALCULATION - PRACTICAL EXAMPLES

// ============================================================================
// SCENARIO: Savings Account with Multiple Interest Deposits
// ============================================================================

// ACCOUNT SETUP
// Account: "Mi Cuenta de Ahorros" (Savings Account)
// Initial Balance: $0

// ============================================================================
// TRANSACTION 1: Initial Deposit
// ============================================================================

addTransaction({
  type: 'income',
  description: 'Depósito Inicial',
  amount: 5000000,          // $5,000,000 COP
  date: '2026-01-01',
  payment_method_id: 'savings_123'
});

// RESULT:
// ✓ Database stores:
//   - amount: 5000000
//   - calculated_yield_amount: null (NOT a yield transaction)
//   - balance_at_transaction: null
//   - category: 'Depósito'
// ✓ Account balance updated: $5,000,000
// ✓ yieldStatistics NOT affected (no yield recorded)

// ============================================================================
// TRANSACTION 2: First Interest/Yield Credit
// ============================================================================

addTransaction({
  type: 'income',
  description: 'Rendimiento del mes de Enero',
  amount: 150000,           // $150,000 COP
  date: '2026-02-01',
  payment_method_id: 'savings_123'
});

// CALCULATION PROCESS:
// 1. System detects: "Rendimiento" in description → Interest transaction
// 2. Query all previous transactions for savings_123:
//    - Transaction 1: Depósito $5,000,000
//    - Sum deposits: $5,000,000
//    - Sum withdrawals: $0
// 3. Calculate: balance_at_transaction = $5,000,000
// 4. Yield amount: $150,000 (the interest amount)

// RESULT:
// ✓ Database stores:
//   - amount: 150000
//   - calculated_yield_amount: 150000 ✓
//   - balance_at_transaction: 5000000 ✓
//   - category: 'Rendimientos'
// ✓ Account balance updated: $5,150,000
// ✓ yieldStatistics updated:
//   - totalYield: $150,000
//   - yieldCount: 1
//   - averageYield: $150,000
//   - yieldByPaymentMethod['savings_123']: $150,000

// ============================================================================
// TRANSACTION 3: Additional Deposit
// ============================================================================

addTransaction({
  type: 'income',
  description: 'Depósito adicional',
  amount: 3000000,          // $3,000,000 COP
  date: '2026-02-15',
  payment_method_id: 'savings_123'
});

// RESULT:
// ✓ Database stores:
//   - amount: 3000000
//   - calculated_yield_amount: null (NOT a yield)
//   - balance_at_transaction: null
// ✓ Account balance updated: $8,150,000

// ============================================================================
// TRANSACTION 4: Second Interest/Yield Credit
// ============================================================================

addTransaction({
  type: 'income',
  description: 'Rendimiento del mes de Febrero',
  amount: 245000,           // $245,000 COP
  date: '2026-03-01',
  payment_method_id: 'savings_123'
});

// CALCULATION PROCESS:
// 1. System detects: "Rendimiento" in description → Interest transaction
// 2. Query all previous transactions for savings_123:
//    - Transaction 1: Depósito $5,000,000
//    - Transaction 2: Rendimiento $150,000 (counted as income)
//    - Transaction 3: Depósito $3,000,000
//    - Sum: $5,000,000 + $150,000 + $3,000,000 = $8,150,000
// 3. Calculate: balance_at_transaction = $8,150,000
// 4. Yield amount: $245,000

// RESULT:
// ✓ Database stores:
//   - amount: 245000
//   - calculated_yield_amount: 245000 ✓
//   - balance_at_transaction: 8150000 ✓
//   - category: 'Rendimientos'
// ✓ Account balance updated: $8,395,000
// ✓ yieldStatistics updated:
//   - totalYield: $395,000 ($150,000 + $245,000)
//   - yieldCount: 2
//   - averageYield: $197,500
//   - yieldByPaymentMethod['savings_123']: $395,000

// ============================================================================
// FINAL STATE
// ============================================================================

// ACCOUNT HISTORY:
// Date         | Type         | Amount      | Calc Yield | Balance At | Account Balance
// -------------|--------------|-------------|------------|------------|----------------
// 2026-01-01   | Depósito     | 5,000,000   | null       | null       | 5,000,000
// 2026-02-01   | Rendimiento  | 150,000     | 150,000    | 5,000,000  | 5,150,000
// 2026-02-15   | Depósito     | 3,000,000   | null       | null       | 8,150,000
// 2026-03-01   | Rendimiento  | 245,000     | 245,000    | 8,150,000  | 8,395,000

// YIELD STATISTICS:
const { yieldStatistics } = useFinanceData();

console.log(yieldStatistics);
// {
//   totalYield: 395000,
//   yieldCount: 2,
//   averageYield: 197500,
//   yieldByPaymentMethod: {
//     'savings_123': 395000
//   },
//   yieldTransactions: [
//     {
//       id: 'txn_2',
//       amount: 150000,
//       calculated_yield_amount: 150000,
//       balance_at_transaction: 5000000,
//       date: '2026-02-01'
//     },
//     {
//       id: 'txn_4',
//       amount: 245000,
//       calculated_yield_amount: 245000,
//       balance_at_transaction: 8150000,
//       date: '2026-03-01'
//     }
//   ]
// }

// ============================================================================
// KEY INSIGHTS
// ============================================================================

// 1. ROI CALCULATION (for each yield transaction):
//    - Transaction 2: ROI = (150,000 / 5,000,000) × 100 = 3.0%
//    - Transaction 4: ROI = (245,000 / 8,150,000) × 100 = 3.0%

// 2. CUMULATIVE YIELD:
//    - Total earned in interest: $395,000
//    - Total invested: $8,000,000 (5M + 3M deposits)
//    - Overall ROI: (395,000 / 8,000,000) × 100 = 4.94%

// 3. COMPOUND EFFECT:
//    - The second yield (245,000) is calculated on a higher balance (8,150,000)
//    - This captures the compounding effect of reinvested yields
//    - Perfect for tracking real yield performance

// ============================================================================
// EDGE CASES HANDLED
// ============================================================================

// CASE 1: Withdrawal Before Interest
addTransaction({
  type: 'expense',
  description: 'Retiro',
  amount: 1000000,
  date: '2026-02-28',
  payment_method_id: 'savings_123'
});

// New balance for next interest:
// Previous: 8,150,000 - 1,000,000 = 7,150,000
// Next interest will calculate against 7,150,000

// CASE 2: Multiple Accounts
// yieldStatistics.yieldByPaymentMethod tracks yields per account:
// {
//   'savings_123': 395000,
//   'savings_456': 280000,
//   'investment_789': 1500000
// }

// CASE 3: Description Variations (all detected as yield)
// ✓ "Interés ganado"
// ✓ "Intereses"
// ✓ "Rendimiento"
// ✓ "Dividendos" (custom - users can add 'rendimiento' to description)
// All trigger the yield calculation logic

// ============================================================================
// DISPLAY IN UI
// ============================================================================

// Transaction Row in History Table:
// Date       | Description          | Category      | Amount    | Yield Info
// -----------|----------------------|---------------|-----------|---------------------------
// 2026-02-01 | Rendimiento enero    | Rendimientos  | 150,000   | Yield: 150K (Balance: 5M)
// 2026-03-01 | Rendimiento febrero  | Rendimientos  | 245,000   | Yield: 245K (Balance: 8.15M)

// Tooltip on hover:
// "Yield transaction: $150,000 calculated on account balance of $5,000,000"
// "Yield transaction: $245,000 calculated on account balance of $8,150,000"

// Dashboard Widget:
// Total Yields Earned: $395,000
// Yield Transactions: 2
// Average Yield: $197,500
// Top Performing Account: Mi Cuenta de Ahorros ($395,000)
