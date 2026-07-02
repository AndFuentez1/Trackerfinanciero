import { useSavings } from '@/features/finance/savings/context/SavingsContext';

export interface SavingsAccount {
  id: string;
  name: string;
  balance: number;
  interest_rate: number;
  savings_goal?: number | null;
  estimated_yield?: number | null;
  yield_period?: 'annual' | 'monthly';
  initial_date?: string | null;
}

export interface SavingsTransaction {
  id: string;
  payment_method_id: string | null;
  savings_account_id: string | null;
  type: 'deposit' | 'withdrawal' | 'interest';
  amount: number;
  date: string;
  description?: string;
  category?: string;
  calculated_yield?: number | null;
  balance_after_transaction?: number | null;
  raw?: unknown;
}

// Global hook to be used by components
export function useSavingsData() {
  return useSavings();
}


