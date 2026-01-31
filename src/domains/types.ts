// Tipos centrales para finanzas (fuente única de verdad)

export type TransactionType =
  | 'income'
  | 'expense'
  | 'saving'
  | 'savings'
  | 'investment'
  | 'transfer_out'
  | 'transfer_in'
  | 'loan'
  | 'other';

export type PaymentMethodType = 'cash' | 'debit' | 'credit' | 'savings' | 'investment';

export interface CategoryItem {
  id: string;
  name: string;
  type: TransactionType;
  color?: string | null;
  is_default?: boolean;
  saving_goal?: number | null;
  user_id?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  balance: number;
  credit_limit?: number | null;
  is_savings_account?: boolean;
  savings_goal?: number | null;
  estimated_yield?: number | null;
  closing_date?: number | null;
  payment_day?: number | null;
  color?: string | null;
  user_id?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string | null;
  category_id?: string | null;
  amount: number;
  description: string;
  date: string;
  payment_method_id?: string | null;
  installments?: number;
  created_at?: string;
}

export interface Budget {
  id: string;
  category: string;
  category_id?: string;
  amount: number;
  month: string;
  spent?: number;
  user_id?: string;
  period?: 'monthly';
  created_at?: string;
  updated_at?: string;
}

export interface Insight {
  id: string;
  type: 'warning' | 'tip' | 'success';
  title: string;
  description: string;
}
