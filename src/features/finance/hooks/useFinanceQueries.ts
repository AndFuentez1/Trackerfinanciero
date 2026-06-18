import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/core/api/queryKeys';
import type { Database } from '@/integrations/supabase/types';
import type { PaymentMethod, PaymentMethodType, CategoryItem, TransactionType, Budget, StagingTransaction } from '../types/financeTypes';
import { buildFinanceCacheKey, readFinanceCache, writeFinanceCache } from '../utils/localCache';
import { normalizeYieldPeriod } from '../utils/yieldUtils';

// Supabase row types
export type ProfileSelect = Pick<
    Database['public']['Tables']['profiles']['Row'],
    'currency' | 'onboarding_decision' | 'has_pending_import' | 'welcome_completed' | 'decimal_places' | 'base_color' | 'country' | 'data_treatment_accepted'
>;

export interface UseFinanceQueriesReturn {
    // Data
    paymentMethods: PaymentMethod[];
    categories: CategoryItem[];
    budgets: Budget[];
    profile: ProfileSelect | null;
    pendingInvoices: Record<string, unknown>[];
    stagingTransactions: StagingTransaction[];

    // Loading states
    pmLoading: boolean;
    catsLoading: boolean;
    budgetsLoading: boolean;
    profileLoading: boolean;
    pendingInvoicesLoading: boolean;
    stagingTransactionsLoading: boolean;
    queriesLoading: boolean;
}

const FINANCE_BOOT_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function useFinanceQueries(userId: string | undefined): UseFinanceQueriesReturn {
    const paymentMethodsCacheKey = useMemo(
        () => (userId ? buildFinanceCacheKey('payment-methods', userId) : null),
        [userId]
    );
    const categoriesCacheKey = useMemo(
        () => (userId ? buildFinanceCacheKey('categories', userId) : null),
        [userId]
    );
    const budgetsCacheKey = useMemo(
        () => (userId ? buildFinanceCacheKey('budgets', userId) : null),
        [userId]
    );
    const profileCacheKey = useMemo(
        () => (userId ? buildFinanceCacheKey('profile', userId) : null),
        [userId]
    );

    const cachedPaymentMethods = useMemo(
        () => (paymentMethodsCacheKey ? readFinanceCache<PaymentMethod[]>(paymentMethodsCacheKey, FINANCE_BOOT_CACHE_MAX_AGE_MS) : undefined),
        [paymentMethodsCacheKey]
    );
    const cachedCategories = useMemo(
        () => (categoriesCacheKey ? readFinanceCache<CategoryItem[]>(categoriesCacheKey, FINANCE_BOOT_CACHE_MAX_AGE_MS) : undefined),
        [categoriesCacheKey]
    );
    const cachedBudgets = useMemo(
        () => (budgetsCacheKey ? readFinanceCache<Budget[]>(budgetsCacheKey, FINANCE_BOOT_CACHE_MAX_AGE_MS) : undefined),
        [budgetsCacheKey]
    );
    const cachedProfile = useMemo(
        () => (profileCacheKey ? readFinanceCache<ProfileSelect | null>(profileCacheKey, FINANCE_BOOT_CACHE_MAX_AGE_MS) : undefined),
        [profileCacheKey]
    );

    // 1. Payment Methods Query
    const { data: paymentMethodsData, isLoading: pmLoading, isFetched: paymentMethodsFetched } = useQuery({
        queryKey: queryKeys.finance.paymentMethods(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return []; }
            const { data, error } = await supabase.from('payment_methods').select('*').eq('user_id', userId);
            if (error) { throw error; }
            return data.map((pm: Record<string, unknown>) => ({
                id: pm.id as string,
                name: pm.name as string,
                type: pm.type as PaymentMethodType,
                balance: Number(pm.balance),
                credit_limit: pm.credit_limit ? Number(pm.credit_limit) : null,
                is_savings_account: (pm.is_savings_account as boolean) || false,
                savings_goal: pm.savings_goal ? Number(pm.savings_goal) : null,
                estimated_yield: pm.estimated_yield ? Number(pm.estimated_yield) : null,
                yield_period: normalizeYieldPeriod(pm.yield_period),
                closing_date: (pm.closing_date as number) || null,
                payment_day: (pm.payment_day as number) || null,
                color: (pm.color as string) || '#475569',
                initial_date: pm.initial_date as string | null,
            }));
        },
        enabled: !!userId,
        placeholderData: cachedPaymentMethods,
        staleTime: Infinity,
    });
    const paymentMethods = paymentMethodsData ?? [];

    // 2. Categories Query
    const { data: categoriesData, isLoading: catsLoading, isFetched: categoriesFetched } = useQuery({
        queryKey: queryKeys.finance.categories(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return []; }
            const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId);
            if (error) { throw error; }
            return data.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type as TransactionType,
                color: c.color,
            }));
        },
        enabled: !!userId,
        placeholderData: cachedCategories,
        staleTime: Infinity,
    });
    const categories = categoriesData ?? [];

    // 3. Budgets Query
    const { data: budgetsData, isLoading: budgetsLoading, isFetched: budgetsFetched } = useQuery({
        queryKey: queryKeys.finance.budgets(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return []; }
            const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId);
            if (error) { throw error; }
            return data.map(b => ({
                id: b.id,
                category: b.category as string,
                category_id: b.category_id,
                amount: Number(b.amount),
                month: b.month,
                user_id: b.user_id,
                is_recurrent: !!b.is_recurrent,
                created_at: b.created_at,
                updated_at: b.updated_at
            }));
        },
        enabled: !!userId,
        placeholderData: cachedBudgets,
        staleTime: 5 * 60 * 1000,
    });
    const budgets = budgetsData ?? [];

    // 4. Profile Query
    const { data: profileData, isLoading: profileLoading, isFetched: profileFetched } = useQuery({
        queryKey: queryKeys.finance.profile(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return null; }
            const { data, error } = await supabase
                .from('profiles')
                .select('currency, onboarding_decision, has_pending_import, welcome_completed, decimal_places, base_color, country, data_treatment_accepted')
                .eq('id', userId)
                .maybeSingle();
            if (error) {
                throw error;
            }
            return data as ProfileSelect;
        },
        enabled: !!userId,
        placeholderData: cachedProfile,
        staleTime: Infinity,
    });
    const profile = profileData ?? null;

    // 5. Pending Invoices Query
    const { data: pendingInvoices = [], isLoading: pendingInvoicesLoading } = useQuery({
        queryKey: queryKeys.finance.pendingInvoices(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return []; }
            const { data, error } = await supabase
                .from('pending_invoices')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .or('source.is.null,source.eq.ai,source.eq.gmail');
            if (error) { throw error; }
            return data || [];
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    // 6. Staging Transactions Query
    const { data: stagingTransactionsData, isLoading: stagingTransactionsLoading } = useQuery({
        queryKey: queryKeys.finance.stagingTransactions(userId ?? ''),
        queryFn: async () => {
            if (!userId) { return []; }
            const { data, error } = await supabase
                .from('excel_import_staging')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) { throw error; }
            return data as StagingTransaction[];
        },
        enabled: !!userId,
        staleTime: 0, // We want staging to be relatively fresh always
    });
    const stagingTransactions = stagingTransactionsData ?? [];

    useEffect(() => {
        if (paymentMethodsCacheKey && paymentMethodsFetched && paymentMethodsData !== undefined) {
            writeFinanceCache(paymentMethodsCacheKey, paymentMethodsData);
        }
    }, [paymentMethodsCacheKey, paymentMethodsFetched, paymentMethodsData]);

    useEffect(() => {
        if (categoriesCacheKey && categoriesFetched && categoriesData !== undefined) {
            writeFinanceCache(categoriesCacheKey, categoriesData);
        }
    }, [categoriesCacheKey, categoriesFetched, categoriesData]);

    useEffect(() => {
        if (budgetsCacheKey && budgetsFetched && budgetsData !== undefined) {
            writeFinanceCache(budgetsCacheKey, budgetsData);
        }
    }, [budgetsCacheKey, budgetsFetched, budgetsData]);

    useEffect(() => {
        if (profileCacheKey && profileFetched && profileData !== undefined) {
            writeFinanceCache(profileCacheKey, profileData);
        }
    }, [profileCacheKey, profileFetched, profileData]);

    const queriesLoading = pmLoading || catsLoading || budgetsLoading || profileLoading;

    return {
        paymentMethods,
        categories,
        budgets,
        profile,
        pendingInvoices,
        stagingTransactions,
        pmLoading,
        catsLoading,
        budgetsLoading,
        profileLoading,
        pendingInvoicesLoading,
        stagingTransactionsLoading,
        queriesLoading,
    };
}
