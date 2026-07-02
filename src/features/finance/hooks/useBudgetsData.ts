import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import type { Database } from '@/integrations/supabase/types';
import type { Transaction } from './useFinanceData';
import type { Budget } from '../types/financeTypes';
import { useFinanceData, TransactionType } from './useFinanceData';
import { startOfMonth, parseISO } from 'date-fns';
import { formatLocalDate } from '@/core/utils';
import { resolveCanonicalBudgetForCategory } from '../utils/budgetUtils';
import { isBudgetMonthInScope } from '../utils/periodFilters';

export type { Budget } from '../types/financeTypes';

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
    const [budgetMonth, setBudgetMonth] = useState<number | 'all' | 'active'>(new Date().getMonth() + 1);
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

        // Categories with type !== 'income'
        const expenseCategories = categories.filter(c => c.type !== 'income');

        expenseCategories.forEach(category => {
            // Calculate total budget amount for the selected period
            let periodBudgetAmount = 0;
            let hasBudgetInSelectedPeriod = false;

            const calcMonthBudget = (y: number, m: number) => {
                const catBudgets = budgets.filter(b => b.category_id === category.id);
                const specific = catBudgets.filter(b => !b.is_recurrent && b.month?.startsWith(`${y}-${String(m).padStart(2, '0')}`));
                if (specific.length > 0) {
                    const latest = specific.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
                    return { amount: latest.amount, hasBudget: true };
                }
                const recurrents = catBudgets.filter(b => b.is_recurrent);
                if (recurrents.length > 0) {
                    const validRecurrents = recurrents.filter(b => {
                        if (!b.month) return true;
                        const bYear = Number(b.month.substring(0, 4));
                        const bMonth = Number(b.month.substring(5, 7));
                        if (bYear < y) return true;
                        if (bYear === y && bMonth <= m) return true;
                        return false;
                    });
                    if (validRecurrents.length > 0) {
                        const latest = validRecurrents.sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0];
                        return { amount: latest.amount, hasBudget: true };
                    }
                }
                return { amount: 0, hasBudget: false };
            };

            const getMonthsToInclude = (year: number) => {
                if (budgetMonth === 'all') {
                    return Array.from({ length: 12 }, (_, index) => index + 1);
                }

                if (budgetMonth === 'active') {
                    const today = new Date();
                    const currentYear = today.getFullYear();
                    const currentMonth = today.getMonth() + 1;
                    if (year < currentYear) {
                        return Array.from({ length: 12 }, (_, index) => index + 1);
                    }
                    if (year === currentYear) {
                        return Array.from({ length: currentMonth }, (_, index) => index + 1);
                    }
                    return [];
                }

                return [budgetMonth as number];
            };

            if (budgetYear !== 'all') {
                const monthsToInclude = getMonthsToInclude(budgetYear);
                monthsToInclude.forEach((m) => {
                    const budgetForMonth = calcMonthBudget(budgetYear, m);
                    periodBudgetAmount += budgetForMonth.amount;
                    hasBudgetInSelectedPeriod = hasBudgetInSelectedPeriod || budgetForMonth.hasBudget;
                });
            } else {
                availableYears.forEach(y => {
                    const monthsToInclude = getMonthsToInclude(y);
                    monthsToInclude.forEach((m) => {
                        const budgetForMonth = calcMonthBudget(y, m);
                        periodBudgetAmount += budgetForMonth.amount;
                        hasBudgetInSelectedPeriod = hasBudgetInSelectedPeriod || budgetForMonth.hasBudget;
                    });
                });
            }

            // Filter Transactions
            const budgetTransactions = (allTransactions || []).filter(t => {
                if (t.category_id !== category.id) { return false; }
                const tDate = parseISO(t.date);
                const tYear = tDate.getFullYear();
                const tMonth = tDate.getMonth() + 1;
                if (budgetYear !== 'all' && tYear !== budgetYear) { return false; }
                if (budgetMonth !== 'all' && !isBudgetMonthInScope({
                    year: tYear,
                    month: tMonth,
                    selectedYear: budgetYear,
                    selectedMonth: budgetMonth === 'all' ? 'all' : budgetMonth,
                    today: new Date(),
                })) { return false; }
                if (t.type !== category.type) { return false; }
                return true;
            }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const spent = budgetTransactions.reduce((sum, t) => sum + t.amount, 0);

            // Include the category when there is a registered budget in the selected scope, even if the amount is 0.
            if (periodBudgetAmount > 0 || spent > 0 || hasBudgetInSelectedPeriod) {
                const remaining = Math.max(0, periodBudgetAmount - spent);
                const percentage = periodBudgetAmount > 0 ? (spent / periodBudgetAmount) * 100 : 0;
                let status: 'ok' | 'warning' | 'overspent' = 'ok';
                if (percentage >= 100) { status = 'overspent'; }
                else if (percentage >= 80) { status = 'warning'; }

                // Determine the most representative budget object for editing
                const catBudgets = budgets.filter(b => b.category_id === category.id);
                const representativeBudget = catBudgets.find(b => b.is_recurrent) || catBudgets[0] || {
                    id: '',
                    category_id: category.id,
                    amount: periodBudgetAmount,
                    category: category.name
                };

                stats.push({
                    budget: { ...representativeBudget, amount: periodBudgetAmount },
                    categoryName: category.name,
                    categoryColor: category.color || undefined,
                    spent,
                    remaining,
                    percentage,
                    status,
                    transactions: budgetTransactions
                });
            }
        });

        return stats;
    }, [budgets, allTransactions, categories, budgetYear, budgetMonth, availableYears]);

    const totalBudgetStats = useMemo((): TotalBudgetState => {
        const totalBudgeted = budgetsStats.reduce((sum, item) => sum + item.budget.amount, 0);
        
        // Calculate totalSpent from allTransactions for the period, ensuring we sum all expenses
        const totalSpent = (allTransactions || [])
            .filter(t => t.type === 'expense')
            .filter(t => {
                const tDate = parseISO(t.date);
                const tYear = tDate.getFullYear();
                const tMonth = tDate.getMonth() + 1;
                if (budgetYear !== 'all' && tYear !== budgetYear) { return false; }
                if (budgetMonth !== 'all' && !isBudgetMonthInScope({
                    year: tYear,
                    month: tMonth,
                    selectedYear: budgetYear,
                    selectedMonth: budgetMonth === 'all' ? 'all' : budgetMonth,
                    today: new Date(),
                })) { return false; }
                return true;
            })
            .reduce((sum, t) => sum + t.amount, 0);

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
    }, [budgetsStats, allTransactions, budgetYear, budgetMonth]);

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
        setBudgetPeriod: (year: number | 'all', month: number | 'all' | 'active') => { setBudgetYear(year); setBudgetMonth(month); },
        availableYears
    };
}
