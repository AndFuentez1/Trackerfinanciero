import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinanceData, Transaction } from './useFinanceData';
import { useAuth } from './useAuth';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export interface Budget {
    id: string;
    user_id: string;
    category_id: string;
    category?: string; // Legacy or fallback name
    amount: number;
    period: 'monthly';
    created_at: string;
    updated_at: string;
}

export interface BudgetState {
    budget: Budget;
    categoryName: string;
    categoryColor?: string;
    spent: number;
    remaining: number;
    percentage: number;
    status: 'ok' | 'warning' | 'overspent';
    transactions: Transaction[];
}

export interface TotalBudgetState {
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentage: number;
    status: 'ok' | 'warning' | 'overspent';
}

export function useBudgetsData() {
    const { user } = useAuth();
    // Use budgets from finance data instead of local state
    const { transactions, categories, budgets: financeBudgets, lastUpdated: financeLastUpdated, refreshData, loading: financeLoading } = useFinanceData();
    const [lastModification, setLastModification] = useState<Date | null>(null);
    const { toast } = useToast();

    // Derived last modification Date from financeLastUpdated
    useEffect(() => {
        if (financeLastUpdated) {
            setLastModification(financeLastUpdated);
        }
    }, [financeLastUpdated]);

    const budgets = financeBudgets as Budget[];
    const loading = financeLoading;

    // Subscribe to changes to refresh finance data (which contains budgets)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('budgets_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'budgets',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refreshData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Derived state calculation
    const budgetsStats = useMemo(() => {
        const stats: BudgetState[] = [];
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        budgets.forEach(budget => {
            // 1. Find category info - Robust matching
            let category = categories.find(c => c.id === budget.category_id);
            if (!category && budget.category) {
                category = categories.find(c => c.name === budget.category);
            }

            const categoryName = category?.name || budget.category || 'Categoría Desconocida';

            // 2. Filter Transactions
            const budgetTransactions = transactions.filter(t => {
                // Must be expense
                if (t.type !== 'expense') return false;

                // Must be in date range
                const tDate = parseISO(t.date);
                if (!isWithinInterval(tDate, { start: monthStart, end: monthEnd })) return false;

                // Must match category_id
                return t.category_id === budget.category_id;
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 3. Calculate metrics
            const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
            const remaining = Math.max(0, budget.amount - spent);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

            let status: 'ok' | 'warning' | 'overspent' = 'ok';
            if (percentage >= 100) status = 'overspent';
            else if (percentage >= 80) status = 'warning';

            stats.push({
                budget,
                categoryName,
                categoryColor: category?.color || undefined,
                spent,
                remaining,
                percentage,
                status,
                transactions: budgetTransactions
            });
        });

        return stats;
    }, [budgets, transactions, categories]);

    const totalBudgetStats = useMemo((): TotalBudgetState => {
        const totalBudgeted = budgetsStats.reduce((sum, item) => sum + item.budget.amount, 0);
        const totalSpent = budgetsStats.reduce((sum, item) => sum + item.spent, 0);
        const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
        const percentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

        let status: 'ok' | 'warning' | 'overspent' = 'ok';
        if (percentage >= 100) status = 'overspent';
        else if (percentage >= 80) status = 'warning';

        return {
            totalBudgeted,
            totalSpent,
            totalRemaining,
            percentage,
            status
        };
    }, [budgetsStats]);
    const saveBudget = async (budgetData: { category_id: string; amount: number; category_name?: string }) => {
        if (!user) return { error: 'No autenticado' };

        // BUSCAR EL NOMBRE DE LA CATEGORÍA SI NO VIENE
        const categoryDetails = categories.find(c => c.id === budgetData.category_id);
        const finalCategoryName = budgetData.category_name || categoryDetails?.name || '';

        const currentMonth = startOfMonth(new Date()).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('budgets')
            .upsert({
                user_id: user.id,
                category_id: budgetData.category_id,
                category: finalCategoryName, // Ahora sí garantizamos el nombre
                amount: budgetData.amount,
                period: 'monthly',
                month: currentMonth,
            }, { onConflict: 'user_id, category_id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving budget:', error);
            toast({ title: 'Error', description: 'No se pudo guardar el presupuesto', variant: 'destructive' });
            return { error };
        }

        refreshData();
        toast({ title: 'Éxito', description: 'Presupuesto guardado correctamente' });
        return { data, error: null };
    };

    return {
        budgets: budgetsStats,
        totalBudget: totalBudgetStats,
        loading,
        refreshBudgets: refreshData,
        saveBudget,
        lastModification
    };
}
