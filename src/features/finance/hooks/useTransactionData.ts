/**
 * useTransactionData Hook
 * 
 * Manages all transaction-related data, including:
 * - Filtered and paginated transactions
 * - Historical data (all transactions)
 * - Derived calculations (summary, insights, chart data)
 */

import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/core/api/queryKeys';
import { mapTransactionRow } from '../utils/transactionMappers';
import { DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';
import { calculateMonthlyInterest, normalizeYieldPeriod } from '../utils/yieldUtils';
import { buildFinanceCacheKey, readFinanceCache, writeFinanceCache } from '../utils/localCache';
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

const PAGE_SIZE = 50;
const TRANSACTIONS_BOOT_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function useTransactionData(
    userId: string | undefined,
    dateFilter: { from: string | null; to: string | null; period: string },
    sortConfig: { column: 'date' | 'amount'; ascending: boolean },
    page: number,
    paymentMethods: PaymentMethod[],
    categories: CategoryItem[],
    budgets: Budget[],
    currency: string = DEFAULT_CURRENCY_CODE
) {
    const [pagedTransactions, setPagedTransactions] = useState<Transaction[]>([]);

    const filterKey = useMemo(() => JSON.stringify({
        userId,
        dateFilter,
        sortConfig
    }), [userId, dateFilter, sortConfig]);

    const isDefaultBootQuery = useMemo(
        () =>
            page === 0 &&
            sortConfig.column === 'date' &&
            sortConfig.ascending === false &&
            dateFilter.period === 'all' &&
            !dateFilter.from &&
            !dateFilter.to,
        [page, sortConfig, dateFilter]
    );

    const transactionsCacheKey = useMemo(
        () => (userId && isDefaultBootQuery ? buildFinanceCacheKey('transactions-boot', userId) : null),
        [userId, isDefaultBootQuery]
    );

    const cachedBootTransactions = useMemo(
        () =>
            transactionsCacheKey
                ? readFinanceCache<{ data: Transaction[]; total: number }>(transactionsCacheKey, TRANSACTIONS_BOOT_CACHE_MAX_AGE_MS)
                : undefined,
        [transactionsCacheKey]
    );

    useEffect(() => {
        setPagedTransactions([]);
    }, [filterKey]);

    // 1. Filtered Transactions Query
    const {
        data: transactionsData,
        isLoading: transactionsLoading,
        isPlaceholderData,
        refetch: refetchTransactions,
        isFetched: transactionsFetched
    } = useQuery({
        queryKey: queryKeys.finance.transactionsFiltered(userId ?? '', {
            ...dateFilter,
            sort: sortConfig,
            page,
            pageSize: PAGE_SIZE
        }),
        queryFn: async () => {
            if (!userId) { return { data: [], total: 0 }; }

            let q = supabase
                .from('transactions')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order(sortConfig.column, { ascending: sortConfig.ascending })
                .order('id', { ascending: sortConfig.ascending });

            if (dateFilter.from) { q = q.gte('date', dateFilter.from); }
            if (dateFilter.to) { q = q.lte('date', dateFilter.to); }

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            q = q.range(from, to);

            const { data, count, error } = await q;
            if (error) { throw error; }

            return {
                data: (data || []).map(mapTransactionRow),
                total: count || 0
            };
        },
        enabled: !!userId,
        placeholderData: (prev) => prev ?? cachedBootTransactions,
        staleTime: 5 * 60 * 1000,
    });

    // 2. All Transactions Query (Historical)
    const { data: allTransactions = [], isLoading: allTransactionsLoading } = useQuery({
        queryKey: userId ? queryKeys.finance.allTransactions(userId) : ['finance', 'allTransactions', 'none'],
        queryFn: async () => {
            if (!userId) { return []; }

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
                    .order('id', { ascending: false })
                    .range(offset, offset + CHUNK_SIZE - 1);

                if (res.error) { throw res.error; }

                if (res.data && res.data.length > 0) {
                    allTxnsData.push(...res.data);
                    if (res.data.length < CHUNK_SIZE) { hasMorePages = false; }
                    else { offset += CHUNK_SIZE; }
                } else {
                    hasMorePages = false;
                }
            }
            const mapped = allTxnsData.map(mapTransactionRow);
            const deduped: Transaction[] = [];
            const seen = new Set<string>();
            mapped.forEach(tx => {
                if (seen.has(tx.id)) { return; }
                seen.add(tx.id);
                deduped.push(tx);
            });
            return deduped;
        },
        enabled: !!userId,
        staleTime: 30 * 60 * 1000,
    });

    useEffect(() => {
        if (
            transactionsCacheKey &&
            transactionsFetched &&
            !isPlaceholderData &&
            transactionsData
        ) {
            writeFinanceCache(transactionsCacheKey, transactionsData);
        }
    }, [transactionsCacheKey, transactionsFetched, isPlaceholderData, transactionsData]);

    // 3. Derived Calculations
    useEffect(() => {
        if (!transactionsData || isPlaceholderData) { return; }

        const incoming = transactionsData.data || [];
        setPagedTransactions(prev => {
            if ((transactionsData.total || 0) === 0) { return []; }
            if (page === 0) { return incoming; }
            const existingIds = new Set(prev.map(t => t.id));
            const merged = [...prev];
            incoming.forEach(t => {
                if (!existingIds.has(t.id)) { merged.push(t); }
            });
            return merged;
        });
    }, [transactionsData, isPlaceholderData, page]);

    const transactions = pagedTransactions.length > 0 ? pagedTransactions : (transactionsData?.data || []);
    const totalTransactionsCount = transactionsData?.total || 0;
    const hasMore = transactions.length < totalTransactionsCount;

    const transactionsForMemos = useMemo(() => transactions, [transactions]);

    const summary = useMemo(() => {
        const source = allTransactions.length > 0 ? allTransactions : transactionsForMemos;
        return calculateSummary(source, currency);
    }, [allTransactions, transactionsForMemos, currency]);

    const filteredSummary = useMemo(() =>
        calculateSummary(transactionsForMemos, currency),
        [transactionsForMemos, currency]
    );

    const expensesByCategory = useMemo(() =>
        calculateExpensesByCategory(transactionsForMemos),
        [transactionsForMemos]
    );

    const budgetsWithSpending = useMemo(() =>
        calculateBudgetProgress(budgets, transactionsForMemos),
        [budgets, transactionsForMemos]
    );

    const insights = useMemo(() =>
        calculateInsights(summary, expensesByCategory, paymentMethods, budgets, transactionsForMemos),
        [summary, expensesByCategory, paymentMethods, budgets, transactionsForMemos]
    );

    const orphanedTransactions = useMemo(() => {
        return transactionsForMemos.filter(t =>
            (!t.category_id || !t.payment_method_id) &&
            t.category !== 'Préstamos' &&
            t.category !== 'Loans'
        );
    }, [transactionsForMemos]);

    // Yield statistics (Can be extracted further if needed)
    const yieldStatistics = useMemo(() => {
        return paymentMethods
            .filter(pm => pm.is_savings_account && pm.balance > 0)
            .map(pm => ({
                id: pm.id,
                name: pm.name,
                balance: pm.balance,
                yield: pm.estimated_yield || 0,
                monthlyYield: calculateMonthlyInterest(
                    pm.balance,
                    pm.estimated_yield || 0,
                    normalizeYieldPeriod(pm.yield_period)
                )
            }));
    }, [paymentMethods]);

    return {
        transactions,
        allTransactions,
        rangeTransactions: transactions, // Alias for backward compatibility
        totalTransactionsCount,
        transactionsLoading,
        allTransactionsLoading,
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
