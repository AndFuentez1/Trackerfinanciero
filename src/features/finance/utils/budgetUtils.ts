import type { Budget } from '../types/financeTypes';

/** Resuelve el presupuesto canónico de una categoría (recurrente > más reciente específico). */
export function resolveCanonicalBudgetForCategory(
    categoryId: string,
    rawBudgets: Budget[]
): Budget | undefined {
    const catBudgets = rawBudgets.filter(b => b.category_id === categoryId);
    if (catBudgets.length === 0) {
        return undefined;
    }

    const recurrent = catBudgets.find(b => b.is_recurrent);
    if (recurrent) {
        return recurrent;
    }

    return catBudgets.sort((a, b) =>
        (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || '')
    )[0];
}
