import { describe, it, expect } from 'vitest';
import type { Budget } from '../types/financeTypes';
import { resolveMonthBudget, getMonthsInScope, sumBudgetForMonths } from './incomeBudget';
import { getCreditDebt, getAvailableCredit } from './creditCardUtils';
import { calculateCurrentRealBalance } from './financeUtils';
import type { PaymentMethod } from '../types/financeTypes';

const budget = (overrides: Partial<Budget>): Budget => ({
    id: 'b',
    category_id: 'income-1',
    amount: 0,
    ...overrides,
});

describe('resolveMonthBudget', () => {
    it('prioriza el presupuesto específico del mes sobre el recurrente', () => {
        const budgets = [
            budget({ id: 'r', amount: 1000, is_recurrent: true, month: '2026-01-01' }),
            budget({ id: 's', amount: 1500, is_recurrent: false, month: '2026-03-01', updated_at: '2026-03-02' }),
        ];
        expect(resolveMonthBudget(budgets, 'income-1', 2026, 3)).toEqual({ amount: 1500, hasBudget: true });
        expect(resolveMonthBudget(budgets, 'income-1', 2026, 4)).toEqual({ amount: 1000, hasBudget: true });
    });

    it('un recurrente no aplica antes de su mes de inicio', () => {
        const budgets = [budget({ amount: 1000, is_recurrent: true, month: '2026-06-01' })];
        expect(resolveMonthBudget(budgets, 'income-1', 2026, 5)).toEqual({ amount: 0, hasBudget: false });
        expect(resolveMonthBudget(budgets, 'income-1', 2026, 6).amount).toBe(1000);
        expect(resolveMonthBudget(budgets, 'income-1', 2027, 1).amount).toBe(1000);
    });

    it('ignora presupuestos de otras categorías', () => {
        const budgets = [budget({ category_id: 'other', amount: 999, is_recurrent: true })];
        expect(resolveMonthBudget(budgets, 'income-1', 2026, 1).hasBudget).toBe(false);
    });
});

describe('getMonthsInScope', () => {
    const today = new Date(2026, 4, 15); // mayo 2026

    it("'all' devuelve los 12 meses", () => {
        expect(getMonthsInScope(2026, 'all', today)).toHaveLength(12);
    });

    it("'active' llega hasta el mes actual en el año en curso", () => {
        expect(getMonthsInScope(2026, 'active', today)).toHaveLength(5);
        expect(getMonthsInScope(2025, 'active', today)).toHaveLength(12);
        expect(getMonthsInScope(2027, 'active', today)).toHaveLength(0);
    });

    it('un mes concreto devuelve solo ese mes', () => {
        expect(getMonthsInScope(2026, 7, today)).toEqual([{ year: 2026, month: 7 }]);
    });
});

describe('sumBudgetForMonths (ingresos estimados)', () => {
    it('suma el presupuesto de ingresos de varias categorías y meses', () => {
        const budgets = [
            budget({ id: 'a', category_id: 'salary', amount: 1000, is_recurrent: true, month: '2026-01-01' }),
            budget({ id: 'b', category_id: 'freelance', amount: 200, is_recurrent: false, month: '2026-02-01' }),
        ];
        const months = getMonthsInScope(2026, 'all');
        const result = sumBudgetForMonths(budgets, ['salary', 'freelance'], months);
        expect(result.amount).toBe(12 * 1000 + 200);
        expect(result.hasBudget).toBe(true);
    });

    it('sin presupuesto devuelve 0 y hasBudget=false', () => {
        expect(sumBudgetForMonths([], ['salary'], getMonthsInScope(2026, 'all'))).toEqual({ amount: 0, hasBudget: false });
    });
});

describe('convención de tarjetas de crédito (deuda = balance negativo)', () => {
    it('getCreditDebt convierte balance negativo en deuda positiva', () => {
        expect(getCreditDebt(-500)).toBe(500);
        expect(getCreditDebt(0)).toBe(0);
        expect(getCreditDebt(300)).toBe(0);
        expect(getCreditDebt(null)).toBe(0);
    });

    it('getAvailableCredit = límite - deuda, nunca negativo', () => {
        expect(getAvailableCredit(1000, -400)).toBe(600);
        expect(getAvailableCredit(1000, 0)).toBe(1000);
        expect(getAvailableCredit(1000, -1500)).toBe(0);
    });

    it('el patrimonio suma balances (la deuda de tarjeta ya es negativa)', () => {
        const methods = [
            { id: '1', name: 'Cuenta', type: 'debit', balance: 1000 },
            { id: '2', name: 'Tarjeta', type: 'credit', balance: -400, credit_limit: 2000 },
        ] as unknown as PaymentMethod[];
        expect(calculateCurrentRealBalance(methods)).toBe(600);
    });
});
