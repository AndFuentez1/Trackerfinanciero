/**
 * Finance Calculations
 * 
 * Pure functions for financial calculations and insights.
 * Extracted from useFinanceDataLogic.ts for better organization.
 */

import type { Transaction, Budget, PaymentMethod, Insight } from '../types/financeTypes';
import { excludeTransfers } from '@/features/finance/utils/cashflowUtils';

/**
 * Calculate financial summary from transactions
 */
export function calculateSummary(
    transactions: Transaction[],
    currency: string
) {
    // Filter out undisbursed loans (they shouldn't affect balance until disbursed)
    const validTransactions = transactions.filter(t =>
        !((t.category === 'Préstamos' || t.category === 'Loans') && !t.payment_method_id)
    );

    const forFlow = excludeTransfers(validTransactions);

    const totalIncome = forFlow
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = forFlow
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalSavings = forFlow
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalInvestments = forFlow
        .filter(t => t.type === 'investment')
        .reduce((sum, t) => sum + t.amount, 0);

    return {
        totalIncome,
        totalExpenses,
        totalSavings,
        totalInvestments,
        netWorth: totalIncome - totalExpenses,
        currency,
    };
}

/**
 * Calculate expenses grouped by category
 */
export function calculateExpensesByCategory(transactions: Transaction[]) {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped: Record<string, { name: string, amount: number, id: string | null }> = {};

    expenses.forEach(expense => {
        const catId = expense.category_id || "none";
        const catName = expense.category || "Sin categoría";

        if (!grouped[catId]) {
            grouped[catId] = { name: catName, amount: 0, id: expense.category_id || null };
        }
        grouped[catId].amount += expense.amount;
    });

    return Object.values(grouped)
        .map(item => ({ category: item.name as string, category_id: item.id, amount: item.amount }))
        .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate budget progress for current month
 */
export function calculateBudgetProgress(budgets: Budget[], transactions: Transaction[]) {
    const currentMonth = new Date().toISOString().substring(0, 7);

    return budgets
        .filter(b => b.month.substring(0, 7) === currentMonth)
        .map(budget => {
            const spent = transactions
                .filter(t => t.type === 'expense' && t.date.substring(0, 7) === currentMonth && t.category === budget.category)
                .reduce((sum, e) => sum + e.amount, 0);

            return {
                ...budget,
                spent,
                percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
            };
        });
}

/**
 * Calculate insights based on financial data
 */
export function calculateInsights(
    summary: ReturnType<typeof calculateSummary>,
    expensesByCategory: ReturnType<typeof calculateExpensesByCategory>,
    paymentMethods: PaymentMethod[],
    budgets: Budget[],
    transactions: Transaction[]
): Insight[] {
    const insights: Insight[] = [];
    const savingsRate = summary.totalIncome > 0
        ? ((summary.totalSavings + summary.totalInvestments) / summary.totalIncome) * 100
        : 0;

    // Savings rate insight
    if (savingsRate < 20 && summary.totalIncome > 0) {
        insights.push({
            id: '1',
            type: 'warning',
            title: 'Ahorro bajo',
            description: `Estás ahorrando solo el ${savingsRate.toFixed(0)}% de tus ingresos. Intenta llegar al 20%.`,
        });
    } else if (summary.totalIncome > 0) {
        insights.push({
            id: '1',
            type: 'success',
            title: '¡Buen ahorro!',
            description: `Estás ahorrando el ${savingsRate.toFixed(0)}% de tus ingresos. ¡Excelente!`,
        });
    }

    // Budget overruns
    const currentMonth = new Date().toISOString().substring(0, 7);
    const budgetsWithSpending = budgets
        .filter(b => b.month.substring(0, 7) === currentMonth)
        .map(budget => {
            const spent = transactions
                .filter(t => t.type === 'expense' && t.date.substring(0, 7) === currentMonth && t.category === budget.category)
                .reduce((sum, e) => sum + e.amount, 0);
            return { ...budget, spent };
        });

    budgetsWithSpending.forEach(budget => {
        if (budget.spent && budget.spent > budget.amount) {
            insights.push({
                id: `budget-${budget.id}`,
                type: 'warning',
                title: `Presupuesto excedido`,
                description: `Has gastado más de lo presupuestado en ${budget.category}.`,
            });
        }
    });

    // Credit card usage
    paymentMethods.forEach(pm => {
        if (pm.type === 'credit' && pm.credit_limit) {
            const usage = (pm.balance / pm.credit_limit) * 100;
            if (usage > 80) {
                insights.push({
                    id: `credit-${pm.id}`,
                    type: 'warning',
                    title: `Alto uso de ${pm.name}`,
                    description: `Has usado el ${usage.toFixed(0)}% de tu límite de crédito.`,
                });
            }
        }
    });

    // Food expenses
    const foodExpenses = expensesByCategory.find(e =>
        e.category.toLowerCase().includes('comida') || e.category.toLowerCase().includes('food')
    );
    if (foodExpenses && summary.totalIncome > 0 && foodExpenses.amount > summary.totalIncome * 0.15) {
        insights.push({
            id: '2',
            type: 'tip',
            title: 'Revisa gastos en comida',
            description: 'Tus gastos en comida superan el 15% de tus ingresos. Considera cocinar más en casa.',
        });
    }

    // Investment suggestion
    if (summary.totalInvestments < summary.totalSavings * 0.5 && summary.totalSavings > 0) {
        insights.push({
            id: '3',
            type: 'tip',
            title: 'Considera invertir más',
            description: 'Tus inversiones son menores que tu ahorro. Invierte para hacer crecer tu dinero.',
        });
    }

    return insights;
}

/**
 * Find orphaned transactions (transactions without valid payment method or category)
 */
export function findOrphanedTransactions(
    transactions: Transaction[],
    paymentMethods: PaymentMethod[],
    categories: Array<{ id: string; name: string }>
) {
    const pmIds = new Set(paymentMethods.map(pm => pm.id));
    const catIds = new Set(categories.map(c => c.id));

    return transactions.filter(t => {
        const hasInvalidPM = t.payment_method_id && !pmIds.has(t.payment_method_id);
        const hasInvalidCat = t.category_id && !catIds.has(t.category_id);
        return hasInvalidPM || hasInvalidCat;
    });
}

export { excludeTransfers } from '@/features/finance/utils/cashflowUtils';
