import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSummary,
  calculateBudgetProgress,
  calculateInsights,
  calculateExpensesByCategory,
} from '../financeCalculations';
import type { Transaction, Budget, PaymentMethod } from '../../types/financeTypes';

const baseTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: 'expense',
  category: 'General',
  amount: 100,
  description: 'Test',
  date: '2024-05-10',
  payment_method_id: 'pm1',
  ...overrides,
});

describe('financeCalculations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculateSummary excludes transfers and undisbursed loans', () => {
    const transactions: Transaction[] = [
      baseTransaction({ type: 'income', amount: 1000, category: 'Salario' }),
      baseTransaction({ type: 'expense', amount: 200, category: 'Comida' }),
      baseTransaction({ type: 'transfer_out', amount: -300, category: 'Transferencia Enviada' }),
      baseTransaction({ type: 'transfer_in', amount: 300, category: 'Transferencia Recibida' }),
      baseTransaction({ type: 'expense', amount: 500, category: 'Préstamos', payment_method_id: null }),
    ];

    const summary = calculateSummary(transactions, 'COP');
    expect(summary.totalIncome).toBe(1000);
    expect(summary.totalExpenses).toBe(200);
    expect(summary.netWorth).toBe(800);
  });

  it('calculateBudgetProgress uses current month and computes percentage', () => {
    const budgets: Budget[] = [
      {
        id: 'b1',
        category: 'Comida',
        category_id: 'cat1',
        amount: 500,
        month: '2024-05-01',
      },
    ];

    const transactions: Transaction[] = [
      baseTransaction({ type: 'expense', amount: 100, category: 'Comida', category_id: 'cat1', date: '2024-05-03' }),
      baseTransaction({ type: 'expense', amount: 50, category: 'Comida', category_id: 'cat1', date: '2024-05-10' }),
      baseTransaction({ type: 'expense', amount: 200, category: 'Comida', category_id: 'cat1', date: '2024-04-10' }),
    ];

    const result = calculateBudgetProgress(budgets, transactions);
    expect(result).toHaveLength(1);
    expect(result[0].spent).toBe(150);
    expect(Math.round(result[0].percentage)).toBe(30);
  });

  it('calculateInsights flags low savings and high credit usage', () => {
    const summary = calculateSummary([
      baseTransaction({ type: 'income', amount: 1000 }),
      baseTransaction({ type: 'expense', amount: 900 }),
    ], 'COP');

    const expensesByCategory = calculateExpensesByCategory([
      baseTransaction({ type: 'expense', amount: 300, category: 'Comida' }),
    ]);

    const paymentMethods: PaymentMethod[] = [
      { id: 'pm1', name: 'TC', type: 'credit', balance: 900, credit_limit: 1000 },
    ];

    const budgets: Budget[] = [];
    const insights = calculateInsights(summary, expensesByCategory, paymentMethods, budgets, []);
    const hasSavingsWarning = insights.some(i => i.title.toLowerCase().includes('ahorro'));
    const hasCreditWarning = insights.some(i => i.title.toLowerCase().includes('alto uso'));

    expect(hasSavingsWarning).toBe(true);
    expect(hasCreditWarning).toBe(true);
  });
});
