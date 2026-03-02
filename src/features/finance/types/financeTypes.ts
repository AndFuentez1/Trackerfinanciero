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
    closing_date?: number | null;
    payment_day?: number | null;
    color?: string | null;
}

// Row type returned by Supabase for payment_methods table
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

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
