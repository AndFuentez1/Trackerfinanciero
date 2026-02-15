import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/core/api/queryKeys';
import type { Database } from '@/integrations/supabase/types';
import type { PaymentMethod, PaymentMethodType, CategoryItem, TransactionType, Budget } from '../types/financeTypes';

// Supabase row types
type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type ProfileSelect = Pick<
    Database['public']['Tables']['profiles']['Row'],
    'currency' | 'onboarding_decision' | 'has_pending_import' | 'welcome_completed' | 'decimal_places' | 'base_color'
>;

export interface UseFinanceQueriesReturn {
    // Data
    paymentMethods: PaymentMethod[];
    categories: CategoryItem[];
    budgets: Budget[];
    profile: ProfileSelect | null;

    // Loading states
    pmLoading: boolean;
    catsLoading: boolean;
    budgetsLoading: boolean;
    profileLoading: boolean;
    queriesLoading: boolean;
}

/**
 * Hook for all TanStack Query data fetching
 * Manages payment methods, categories, budgets, and profile queries
 */
export function useFinanceQueries(userId: string | undefined): UseFinanceQueriesReturn {
    // 1. Payment Methods Query
    const { data: paymentMethods = [], isLoading: pmLoading } = useQuery({
        queryKey: queryKeys.finance.paymentMethods(userId ?? ''),
        queryFn: async () => {
            if (!userId) {return [];}
            const { data, error } = await supabase.from('payment_methods').select('*').eq('user_id', userId);
            if (error) {throw error;}
            return data.map((pm: PaymentMethodRow) => ({
                id: pm.id,
                name: pm.name,
                type: pm.type as PaymentMethodType,
                balance: Number(pm.balance),
                credit_limit: pm.credit_limit ? Number(pm.credit_limit) : null,
                is_savings_account: pm.is_savings_account || false,
                savings_goal: pm.savings_goal ? Number(pm.savings_goal) : null,
                estimated_yield: pm.estimated_yield ? Number(pm.estimated_yield) : null,
                closing_date: pm.closing_date || null,
                payment_day: pm.payment_day || null,
                color: pm.color || '#475569',
            }));
        },
        enabled: !!userId,
        staleTime: Infinity,
    });

    // 2. Categories Query
    const { data: categories = [], isLoading: catsLoading } = useQuery({
        queryKey: queryKeys.finance.categories(userId ?? ''),
        queryFn: async () => {
            if (!userId) {return [];}
            const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId);
            if (error) {throw error;}
            return data.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type as TransactionType,
                color: c.color,
            }));
        },
        enabled: !!userId,
        staleTime: Infinity,
    });

    // 3. Budgets Query
    const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
        queryKey: queryKeys.finance.budgets(userId ?? ''),
        queryFn: async () => {
            if (!userId) {return [];}
            const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId);
            if (error) {throw error;}
            return data.map(b => ({
                id: b.id,
                category: b.category as string,
                category_id: b.category_id,
                amount: Number(b.amount),
                month: b.month,
                user_id: b.user_id,
                created_at: b.created_at,
                updated_at: b.updated_at
            }));
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    // 4. Profile Query
    const { data: profile = null, isLoading: profileLoading } = useQuery({
        queryKey: queryKeys.finance.profile(userId ?? ''),
        queryFn: async () => {
            if (!userId) {return null;}
            const { data, error } = await supabase
                .from('profiles')
                .select('currency, onboarding_decision, has_pending_import, welcome_completed, decimal_places, base_color')
                .eq('id', userId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {return null;} // No profile found
                throw error;
            }
            return data as ProfileSelect;
        },
        enabled: !!userId,
        staleTime: Infinity,
    });

    const queriesLoading = pmLoading || catsLoading || budgetsLoading || profileLoading;

    return {
        paymentMethods,
        categories,
        budgets,
        profile,
        pmLoading,
        catsLoading,
        budgetsLoading,
        profileLoading,
        queriesLoading,
    };
}
