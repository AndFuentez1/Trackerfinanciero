import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import type { Database } from '@/integrations/supabase/types';
import type { Transaction } from './useFinanceData';
import { useFinanceData, TransactionType } from './useFinanceData';
import { startOfMonth, parseISO } from 'date-fns';
import { formatLocalDate } from '@/core/utils';
import { resolveCanonicalBudgetForCategory } from '../utils/budgetUtils';

export interface Budget {
    id: string;
    user_id: string;
    category_id: string;
    category?: string; // Legacy or fallback name
    amount: number;
    period: 'monthly';
    month?: string;
    is_recurrent?: boolean;
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
    const {
        transactions,
        allTransactions,
        categories,
        budgets: financeBudgets,
        lastUpdated: financeLastUpdated,
        refreshData,
        bootLoading: financeBootLoading
    } = useFinanceData();
    const [lastModification, setLastModification] = useState<Date | null>(null);
    const [budgetYear, setBudgetYear] = useState<number | 'all'>(new Date().getFullYear());
    const [budgetMonth, setBudgetMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
    const { toast } = useToast();

    // Derived last modification Date from financeLastUpdated
    useEffect(() => {
        if (financeLastUpdated) {
            setLastModification(financeLastUpdated);
        }
    }, [financeLastUpdated]);

    const budgets = financeBudgets as Budget[];
    const loading = financeBootLoading;

    // Years available from budgets (fallback to current year)
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        budgets.forEach(b => {
            if (b.month) {
                const y = Number(b.month.substring(0, 4));
                if (!Number.isNaN(y)) { years.add(y); }
            }
        });
        // También incluir años detectados en transacciones para que el filtro cubra todo el histórico
        allTransactions?.forEach(t => {
            const y = new Date(t.date).getFullYear();
            if (!Number.isNaN(y)) { years.add(y); }
        });
        if (years.size === 0) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a, b) => b - a);
    }, [budgets, allTransactions]);

    // Ensure selected year stays within available options
    useEffect(() => {
        if (availableYears.length === 0) { return; }
        if (budgetYear !== 'all' && !availableYears.includes(budgetYear)) {
            setBudgetYear(availableYears[0]);
        }
    }, [availableYears, budgetYear]);

    // Subscribe to changes to refresh finance data (which contains budgets)
    useEffect(() => {
        if (!user) { return; }

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
    }, [user, refreshData]);

    // Derived state calculation
    const budgetsStats = useMemo(() => {
        const stats: BudgetState[] = [];

        const filteredBudgets = budgets.filter(b => {
            // Budgets are only for expenses and savings — exclude any income-type budgets
            const cat = categories.find(c => c.id === b.category_id);
            if (cat?.type === 'income') { return false; }

            const bYear = b.month ? Number(b.month.substring(0, 4)) : NaN;
            const bMonth = b.month ? Number(b.month.substring(5, 7)) : NaN;

            if (b.is_recurrent) {
                // Recurrent budget: applies starting from its start month
                if (budgetYear !== 'all' && !Number.isNaN(bYear)) {
                    if (bYear > budgetYear) { return false; }
                    if (bYear === budgetYear && budgetMonth !== 'all' && !Number.isNaN(bMonth)) {
                        if (bMonth > budgetMonth) { return false; }
                    }
                }
                return true;
            } else {
                // Specific budget: must match selected year and month exactly
                if (budgetYear !== 'all' && !Number.isNaN(bYear) && bYear !== budgetYear) { return false; }
                if (budgetMonth !== 'all' && !Number.isNaN(bMonth) && bMonth !== budgetMonth) { return false; }
                return true;
            }
        });

        // Group candidate budgets by category_id to resolve overrides
        const budgetsMap = new Map<string, Budget>();
        filteredBudgets.forEach(b => {
            const existing = budgetsMap.get(b.category_id);
            if (!existing) {
                budgetsMap.set(b.category_id, b);
            } else {
                // If existing is recurrent and new is specific, override with specific
                if (existing.is_recurrent && !b.is_recurrent) {
                    budgetsMap.set(b.category_id, b);
                }
                // If both are recurrent, choose the one with the later start date
                else if (existing.is_recurrent && b.is_recurrent) {
                    if (b.month && existing.month && b.month > existing.month) {
                        budgetsMap.set(b.category_id, b);
                    }
                }
                // If both are specific, choose the latest updated
                else if (!existing.is_recurrent && !b.is_recurrent) {
                    if (b.updated_at > existing.updated_at) {
                        budgetsMap.set(b.category_id, b);
                    }
                }
            }
        });

        const resolvedBudgets = Array.from(budgetsMap.values());

        resolvedBudgets.forEach(budget => {
            // 1. Find category info - Robust matching
            let category = categories.find(c => c.id === budget.category_id);
            if (!category && budget.category) {
                category = categories.find(c => c.name === budget.category);
            }

            const categoryName = category?.name || budget.category || 'Categoría Desconocida';

            // 2. Filter Transactions
            const budgetTransactions = transactions.filter(t => {
                // Must be in date range: match year and, if selected, month
                const tDate = parseISO(t.date);
                const tYear = tDate.getFullYear();
                const tMonth = tDate.getMonth() + 1;
                if (budgetYear !== 'all' && tYear !== budgetYear) { return false; }
                if (budgetMonth !== 'all' && tMonth !== budgetMonth) { return false; }

                // Must match category_id
                if (t.category_id !== budget.category_id) { return false; }

                // NEW: Validate type match if category info is available
                if (category) {
                    if (t.type !== category.type) { return false; }
                }

                return true;
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            // 3. Calculate metrics
            const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);
            const remaining = Math.max(0, budget.amount - spent);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

            let status: 'ok' | 'warning' | 'overspent' = 'ok';
            if (percentage >= 100) { status = 'overspent'; }
            else if (percentage >= 80) { status = 'warning'; }

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
    }, [budgets, transactions, categories, budgetYear, budgetMonth]);

    const totalBudgetStats = useMemo((): TotalBudgetState => {
        const totalBudgeted = budgetsStats.reduce((sum, item) => sum + item.budget.amount, 0);
        const totalSpent = budgetsStats.reduce((sum, item) => sum + item.spent, 0);
        const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
        const percentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

        let status: 'ok' | 'warning' | 'overspent' = 'ok';
        if (percentage >= 100) { status = 'overspent'; }
        else if (percentage >= 80) { status = 'warning'; }

        return {
            totalBudgeted,
            totalSpent,
            totalRemaining,
            percentage,
            status
        };
    }, [budgetsStats]);

    const saveBudget = async (budgetData: { 
        id?: string;
        category_id: string; 
        amount: number; 
        category?: string; 
        category_name?: string; 
        month?: string; 
        is_recurrent?: boolean; 
    }) => {
        if (!user) { return { error: 'No autenticado' }; }

        // BUSCAR EL NOMBRE DE LA CATEGORÍA SI NO VIENE
        const categoryDetails = categories.find(c => c.id === budgetData.category_id);
        const finalCategoryName = budgetData.category || budgetData.category_name || categoryDetails?.name || '';

        // Evitar problemas de zona horaria: budgetData.month ya viene como YYYY-MM-DD
        // Solo extraer YYYY-MM y agregar -01 para primer día del mes
        const targetMonth = budgetData.month
            ? budgetData.month.substring(0, 7) + '-01'
            : formatLocalDate(startOfMonth(new Date()));

        const isRecurrent = budgetData.is_recurrent || false;
        let activeId = budgetData.id;

        // Si se actualiza un presupuesto existente y cambia mes o recurrencia, eliminar el registro anterior
        if (activeId) {
            const { data: existing } = await supabase
                .from('budgets')
                .select('month, is_recurrent')
                .eq('id', activeId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                const existingMonth = existing.month?.substring(0, 7);
                const newMonth = targetMonth.substring(0, 7);
                if (existingMonth !== newMonth || !!existing.is_recurrent !== isRecurrent) {
                    await supabase.from('budgets').delete().eq('id', activeId);
                    activeId = undefined; // Se eliminó, por lo que el upsert debe insertar una nueva fila
                }
            }
        }

        // Eliminar presupuesto recurrente previo para esta categoría para evitar conflictos con el índice único
        if (isRecurrent) {
            const deleteQuery = supabase
                .from('budgets')
                .delete()
                .eq('user_id', user.id)
                .eq('category_id', budgetData.category_id)
                .eq('is_recurrent', true);
            
            if (activeId) {
                await deleteQuery.ne('id', activeId);
            } else {
                await deleteQuery;
            }
        }

        const upsertData: Record<string, any> = {
            user_id: user.id,
            category_id: budgetData.category_id,
            category: finalCategoryName,
            amount: budgetData.amount,
            period: 'monthly',
            month: targetMonth,
            is_recurrent: isRecurrent,
        };

        if (activeId) {
            upsertData.id = activeId;
        }

        const { data, error } = await supabase
            .from('budgets')
            .upsert(upsertData, { onConflict: 'user_id,category_id,month' })
            .select()
            .single();

        if (error) {
            toast({ title: 'Error', description: 'No se pudo guardar el presupuesto', variant: 'destructive' });
            return { error };
        }

        // Refresh data and wait for it to complete
        await refreshData();

        return { data, error: null };
    };

    const deleteBudget = async (budgetId: string) => {
        if (!user) { return { error: 'No autenticado' }; }

        const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', budgetId);

        if (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar el presupuesto', variant: 'destructive' });
            return { error };
        }

        toast({ title: 'Éxito', description: 'Presupuesto eliminado correctamente' });
        await refreshData();
        return { error: null };
    };

    return {
        budgets: budgetsStats,
        rawBudgets: budgets,
        resolveCanonicalBudgetForCategory: (categoryId: string) =>
            resolveCanonicalBudgetForCategory(categoryId, budgets),
        totalBudget: totalBudgetStats,
        loading,
        refreshBudgets: refreshData,
        saveBudget,
        deleteBudget,
        lastModification,
        budgetYear,
        budgetMonth,
        setBudgetPeriod: (year: number | 'all', month: number | 'all') => { setBudgetYear(year); setBudgetMonth(month); },
        availableYears
    };
}
