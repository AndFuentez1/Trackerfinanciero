/**
 * useTransactionData Hook
 * 
 * Manages all transaction-related data, including:
 * - Filtered and paginated transactions
 * - Historical data (all transactions)
 * - Derived calculations (summary, insights, chart data)
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/core/api/queryKeys';
import { mapTransactionRow } from '../utils/transactionMappers';
import type {
    Transaction,
    TransactionType,
    PaymentMethod,
    CategoryItem,
    Budget,
    Insight
} from '../types/financeTypes';
import {
    calculateSummary,
    calculateExpensesByCategory,
    calculateBudgetProgress,
    calculateInsights
} from '../utils/financeCalculations';

const PAGE_SIZE = 200;

export function useTransactionData(
    userId: string | undefined,
    dateFilter: { from: string | null; to: string | null; period: string },
    sortConfig: { column: 'date' | 'amount'; ascending: boolean },
    page: number,
    paymentMethods: PaymentMethod[],
    categories: CategoryItem[],
    budgets: Budget[],
    currency: string = 'COP'
) {
    const queryClient = useQueryClient();
    const hasLoadedAllTransactionsRef = useRef(false);
    const [pagedTransactions, setPagedTransactions] = useState<Transaction[]>([]);

    const filterKey = useMemo(() => JSON.stringify({
        userId,
        dateFilter,
        sortConfig
    }), [userId, dateFilter, sortConfig]);

    useEffect(() => {
        setPagedTransactions([]);
    }, [filterKey]);

    useEffect(() => {
        hasLoadedAllTransactionsRef.current = false;
    }, [userId]);

    // 1. Filtered Transactions Query
    const {
        data: transactionsData,
        isLoading: transactionsLoading,
        isPlaceholderData,
        refetch: refetchTransactions
    } = useQuery({
        queryKey: queryKeys.finance.transactionsFiltered(userId ?? '', {
            ...dateFilter,
            sort: sortConfig,
            page,
            pageSize: PAGE_SIZE
        }),
        queryFn: async () => {
            if (!userId) return { data: [], total: 0 };

            let q = supabase
                .from('transactions')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order(sortConfig.column, { ascending: sortConfig.ascending });

            if (dateFilter.from) q = q.gte('date', dateFilter.from);
            if (dateFilter.to) q = q.lte('date', dateFilter.to);

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            q = q.range(from, to);

            const { data, count, error } = await q;
            if (error) throw error;

            return {
                data: (data || []).map(mapTransactionRow),
                total: count || 0
            };
        },
        enabled: !!userId,
        placeholderData: (prev) => prev,
        staleTime: 5 * 60 * 1000,
    });

    // 2. All Transactions Query (Historical)
    const { data: allTransactions = [] } = useQuery({
        queryKey: ['finance', 'allTransactions', userId],
        queryFn: async () => {
            if (!userId) return [];

            const allTxnsData = [];
            let hasMorePages = true;
            let offset = 0;
            const CHUNK_SIZE = 1000;

            while (hasMorePages) {
                const res = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', userId)
                    .order('date', { ascending: false })
                    .range(offset, offset + CHUNK_SIZE - 1);

                if (res.error) throw res.error;

                if (res.data && res.data.length > 0) {
                    allTxnsData.push(...res.data);
                    if (res.data.length < CHUNK_SIZE) hasMorePages = false;
                    else offset += CHUNK_SIZE;
                } else {
                    hasMorePages = false;
                }
            }
            hasLoadedAllTransactionsRef.current = true;
            return allTxnsData.map(mapTransactionRow);
        },
        enabled: !!userId && !hasLoadedAllTransactionsRef.current,
        staleTime: 30 * 60 * 1000,
    });

    // 3. Derived Calculations
    useEffect(() => {
        if (!transactionsData || isPlaceholderData) return;

        const incoming = transactionsData.data || [];
        setPagedTransactions(prev => {
            if (page === 0) return incoming;
            const existingIds = new Set(prev.map(t => t.id));
            const merged = [...prev];
            incoming.forEach(t => {
                if (!existingIds.has(t.id)) merged.push(t);
            });
            return merged;
        });
    }, [transactionsData, isPlaceholderData, page]);

    const transactions = pagedTransactions.length > 0 ? pagedTransactions : (transactionsData?.data || []);
    const totalTransactionsCount = transactionsData?.total || 0;
    const hasMore = transactions.length < totalTransactionsCount;

    const summary = useMemo(() => {
        const source = allTransactions.length > 0 ? allTransactions : transactions;
        return calculateSummary(source, currency);
    }, [allTransactions, transactions, currency]);

    const filteredSummary = useMemo(() =>
        calculateSummary(transactions, currency),
        [transactions, currency]
    );

    const expensesByCategory = useMemo(() =>
        calculateExpensesByCategory(transactions),
        [transactions]
    );

    const budgetsWithSpending = useMemo(() =>
        calculateBudgetProgress(budgets, transactions),
        [budgets, transactions]
    );

    const insights = useMemo(() =>
        calculateInsights(summary, expensesByCategory, paymentMethods, budgets, transactions),
        [summary, expensesByCategory, paymentMethods, budgets, transactions]
    );

    const orphanedTransactions = useMemo(() => {
        return transactions.filter(t =>
            (!t.category_id || !t.payment_method_id) &&
            t.category !== 'Préstamos' &&
            t.category !== 'Loans'
        );
    }, [transactions]);

    // Yield statistics (Can be extracted further if needed)
    const yieldStatistics = useMemo(() => {
        return paymentMethods
            .filter(pm => pm.is_savings_account && pm.balance > 0)
            .map(pm => ({
                id: pm.id,
                name: pm.name,
                balance: pm.balance,
                yield: pm.estimated_yield || 0,
                monthlyYield: (pm.balance * (pm.estimated_yield || 0)) / 100 / 12
            }));
    }, [paymentMethods]);

    return {
        transactions,
        allTransactions,
        rangeTransactions: transactions, // Alias for backward compatibility
        totalTransactionsCount,
        transactionsLoading,
        hasMore,
        summary,
        filteredSummary,
        expensesByCategory,
        budgetsWithSpending,
        insights,
        orphanedTransactions,
        yieldStatistics,
        refetchTransactions
    };
}
