import type { Database } from '@/integrations/supabase/types';

export type TransactionType = 'income' | 'expense' | 'saving' | 'savings' | 'investment' | 'transfer_out' | 'transfer_in' | 'loan' | 'other';
export type PaymentMethodType = 'cash' | 'debit' | 'credit' | 'savings' | 'investment';

export interface CategoryItem {
    id: string;
    name: string;
    type: TransactionType;
    color?: string | null;
    is_default?: boolean;
    saving_goal?: number | null;
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
    category_name?: string;
    payment_method_name?: string;
    sync_code?: string | null;
}

export interface StagingTransaction {
    id: string;
    user_id: string;
    date: string;
    description: string;
    amount: number;
    category?: string | null;
    category_id?: string | null;
    payment_method?: string | null;
    payment_method_id?: string | null;
    type?: TransactionType | null;
    is_duplicate: boolean;
    status: 'pending' | 'imported' | 'ignored';
    created_at?: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    type: PaymentMethodType;
    balance: number;
    credit_limit?: number | null;
    is_savings_account?: boolean;
    savings_goal?: number | null;
    estimated_yield?: number | null; // Rentabilidad Estimada (%)
    yield_period?: 'annual' | 'monthly';
    closing_date?: number | null;
    payment_day?: number | null;
    color?: string | null;
    initial_date?: string | null;
}

// Row type returned by Supabase for payment_methods table
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export interface Budget {
    id: string;
    /** FK to categories table — the primary identifier. */
    category_id: string;
    /** Legacy string column kept for backwards-compat display; may be absent. */
    category?: string;
    amount: number;
    /** ISO date (YYYY-MM-DD) of the budget's start month. Optional for recurrent budgets read pre-month assignment. */
    month?: string;
    spent?: number;
    user_id?: string;
    period?: 'monthly';
    is_recurrent?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Insight {
    id: string;
    type: 'warning' | 'tip' | 'success';
    title: string;
    description: string;
}

export interface FutureExpense {
    id: string;
    payment_date: string;
    amount: number;
    description: string;
    category_id: string | null;
    type: 'expense' | 'income' | 'saving';
    status: 'pending' | 'paid';
    is_subscription?: boolean;
    payment_day?: number;
    start_date?: string;
    end_date?: string;
    frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly';
}

export type PendingInvoice = Database['public']['Tables']['pending_invoices']['Row'];
