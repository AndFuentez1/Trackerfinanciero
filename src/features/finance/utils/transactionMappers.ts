/**
 * Transaction Mappers
 * 
 * Functions to map Supabase row types to domain types.
 * Extracted from useFinanceDataLogic.ts for better organization.
 */

import type { Database } from '@/integrations/supabase/types';
import type { Transaction, TransactionType, PaymentMethod, Budget } from '../types/financeTypes';

export type TransactionRow = Database['public']['Tables']['transactions']['Row'];
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type BudgetRow = Database['public']['Tables']['budgets']['Row'];

/**
 * Map Supabase transaction row to domain Transaction type
 */
export const mapTransactionRow = (t: TransactionRow): Transaction => {
    const extra = t as unknown as { installments?: number | null };
    return {
        id: t.id,
        type: t.type === 'transfer'
            ? (t.category === 'Transferencia Enviada' ? 'transfer_out' : 'transfer_in') as TransactionType
            : t.type as TransactionType,
        category: t.category,
        category_id: t.category_id ?? null,
        amount: Number(t.amount),
        description: t.description,
        date: t.date,
        payment_method_id: t.payment_method_id ?? null,
        installments: extra.installments ?? undefined,
        created_at: t.created_at,
    };
};

/**
 * Map Supabase payment method row to domain PaymentMethod type
 */
export const mapPaymentMethodRow = (pm: PaymentMethodRow): PaymentMethod => {
    return {
        id: pm.id,
        name: pm.name,
        type: pm.type as 'cash' | 'debit' | 'credit' | 'savings',
        balance: Number(pm.balance),
        credit_limit: pm.credit_limit ? Number(pm.credit_limit) : null,
        color: pm.color ?? undefined,
        savings_goal: pm.savings_goal ? Number(pm.savings_goal) : undefined,
    };
};

/**
 * Map Supabase budget row to domain Budget type
 */
export const mapBudgetRow = (b: BudgetRow): Budget => {
    return {
        id: b.id,
        category: b.category as string,
        category_id: b.category_id,
        amount: Number(b.amount),
        month: b.month,
        user_id: b.user_id,
        created_at: b.created_at,
        updated_at: b.updated_at,
    };
};
