import type { Budget } from '../types/financeTypes';

export interface MonthBudgetResult {
    amount: number;
    hasBudget: boolean;
}

export interface YearMonth {
    year: number;
    month: number; // 1-12
}

/**
 * Presupuesto efectivo de una categoría para un mes:
 * un presupuesto específico del mes tiene prioridad sobre el recurrente vigente.
 * Es la única fuente de verdad para gastos, ahorros e ingresos.
 */
export function resolveMonthBudget(
    budgets: Budget[],
    categoryId: string,
    year: number,
    month: number
): MonthBudgetResult {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const categoryBudgets = budgets.filter(b => b.category_id === categoryId);

    const specific = categoryBudgets.filter(b => !b.is_recurrent && b.month?.startsWith(prefix));
    if (specific.length > 0) {
        const latest = [...specific].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
        return { amount: latest.amount, hasBudget: true };
    }

    const validRecurrents = categoryBudgets.filter(b => {
        if (!b.is_recurrent) { return false; }
        if (!b.month) { return true; }
        const bYear = Number(b.month.substring(0, 4));
        const bMonth = Number(b.month.substring(5, 7));
        return bYear < year || (bYear === year && bMonth <= month);
    });

    if (validRecurrents.length > 0) {
        const latest = [...validRecurrents].sort((a, b) => (b.month || '').localeCompare(a.month || ''))[0];
        return { amount: latest.amount, hasBudget: true };
    }

    return { amount: 0, hasBudget: false };
}

/**
 * Meses incluidos en el periodo seleccionado.
 * - month 'all': los 12 meses; 'active': hasta el mes actual (años pasados completos, futuros vacíos).
 */
export function getMonthsInScope(
    year: number,
    selectedMonth: number | 'all' | 'active',
    today: Date = new Date()
): YearMonth[] {
    const all = Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }));

    if (selectedMonth === 'all') { return all; }

    if (selectedMonth === 'active') {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        if (year < currentYear) { return all; }
        if (year === currentYear) { return all.slice(0, currentMonth); }
        return [];
    }

    return [{ year, month: selectedMonth }];
}

/** Suma el presupuesto de varias categorías sobre una lista de meses. */
export function sumBudgetForMonths(
    budgets: Budget[],
    categoryIds: string[],
    months: YearMonth[]
): { amount: number; hasBudget: boolean } {
    let amount = 0;
    let hasBudget = false;
    for (const categoryId of categoryIds) {
        for (const { year, month } of months) {
            const result = resolveMonthBudget(budgets, categoryId, year, month);
            amount += result.amount;
            hasBudget = hasBudget || result.hasBudget;
        }
    }
    return { amount, hasBudget };
}
