import { describe, it, expect, vi } from 'vitest';
import { calculateMonthlySnapshot, differenceInCalendarMonths, MonthlySnapshot } from './cashFlowCalculations';
import { addMonths, startOfMonth } from 'date-fns';
import type { Transaction, PaymentMethod, Budget } from '@/features/finance/types/financeTypes';
import type { Loan } from '@/features/finance/hooks/useLoansLogic';
import type { SavingsAccount } from '@/features/finance/hooks/useSavingsData';

describe('cashFlowCalculations', () => {
    describe('differenceInCalendarMonths', () => {
        it('calculates difference correctly within same year', () => {
            const d1 = new Date(2024, 5, 1); // June
            const d2 = new Date(2024, 2, 1); // March
            expect(differenceInCalendarMonths(d1, d2)).toBe(3);
        });
        it('calculates difference across years', () => {
            const d1 = new Date(2025, 1, 1); // Feb 2025
            const d2 = new Date(2024, 11, 1); // Dec 2024
            expect(differenceInCalendarMonths(d1, d2)).toBe(2);
        });
    });

    describe('calculateMonthlySnapshot', () => {
        const baseDate = new Date(2024, 5, 15); // June 15, 2024
        const buildContext = (
            transactions: Transaction[],
            currentMonthStart = new Date(2024, 5, 1),
            lastTxDate = new Date(2024, 5, 20),
        ) => {
            const map = new Map<string, Transaction[]>();
            transactions.forEach(tx => {
                const key = tx.date.substring(0, 7);
                const list = map.get(key) ?? [];
                list.push(tx);
                map.set(key, list);
            });
            return {
                currentMonthStart,
                lastTxDate,
                categories: [],
                transactionsByMonth: map
            };
        };
        const emptyData = {
            transactions: [],
            paymentMethods: [],
            savingsAccounts: [],
            loans: [],
            budgets: [],
            futureExpenses: [],
            categories: [],
            incomeMode: 'real' as const
        };

        it('returns zero values for empty input', () => {
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {}, emptyData, buildContext([])
            );

            expect(result.ingresosTotales).toBe(0);
            expect(result.egresosTotales).toBe(0);
            expect(result.balanceNetoMes).toBe(0);
        });

        it('calculates real income from transactions', () => {
            const transactions: Transaction[] = [
                { id: '1', type: 'income', amount: 1000, date: '2024-06-10', description: 'Salary', category: 'Salario' } as any
            ];
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {},
                { ...emptyData, transactions, categories: [{ id: 'c1', name: 'Salario', type: 'income' }] },
                buildContext(transactions as Transaction[])
            );

            expect(result.ingresosTotales).toBe(1000);
            expect(result.ingresosSalario).toBe(1000);
        });

        it('calculates real expenses from transactions', () => {
            const transactions: Transaction[] = [
                { id: '1', type: 'expense', amount: 500, date: '2024-06-10', description: 'Food', category: 'Comida' } as any
            ];
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {},
                { ...emptyData, transactions },
                buildContext(transactions as Transaction[])
            );

            expect(result.egresosTotales).toBe(500);
            expect(result.egresosReales).toBe(500);
        });

        it('applies future expenses excluding pending past ones if logic dictates', () => {
            // Logic in useCashFlow handles calling this for future months.
            // But if we pass a future date to this function, it should include future expenses.
            const futureDate = addMonths(baseDate, 1); // July
            const futureContext = { ...buildContext([]), currentMonthStart: startOfMonth(baseDate) }; // June is current
            // July is NOT past.

            const futureExpenses = [
                { id: 'f1', payment_date: '2024-07-15', amount: 200, status: 'pending', description: 'Bill', category_id: null } as any
            ];

            const result = calculateMonthlySnapshot(
                futureDate, 0, {}, {}, {},
                { ...emptyData, futureExpenses },
                futureContext
            );

            expect(result.gastosFuturos).toBe(200);
            expect(result.egresosTotales).toBe(200);
        });

        it('amortizes loans correctly using French system', () => {
            // Loan: 1000, 10% annual, 12 months.
            // Monthly rate = 0.10/12 = 0.008333...
            // Payment ~ 87.91
            const loan: Loan = {
                id: 'l1', name: 'Test Loan', total_amount: 1000, paid_amount: 0, interest_rate: 10,
                user_id: 'u1', type: 'borrowed', created_at: '', due_date: null, payment_method_id: null,
                installments: 12
            };

            const result = calculateMonthlySnapshot(
                baseDate, 0, {},
                { 'l1': { saldo: 1000, cuotasRestantes: 12 } }, // Injected state
                {},
                { ...emptyData, loans: [loan] },
                buildContext([])
            );

            expect(result.egresosPrestamos).toBeGreaterThan(87);
            expect(result.egresosPrestamos).toBeLessThan(88);
            expect(result.newLoans['l1'].cuotasRestantes).toBe(11);
        });

        it('moves overdue future expenses to current month and avoids past months', () => {
            const currentMonthStart = new Date(2024, 5, 1); // June
            const pastMonthDate = new Date(2024, 4, 15); // May
            const currentMonthDate = new Date(2024, 5, 15); // June

            const futureExpenses = [
                { id: 'f1', payment_date: '2024-05-10', amount: 200, status: 'pending', description: 'Internet', category_id: 'c1' } as any
            ];

            const pastResult = calculateMonthlySnapshot(
                pastMonthDate, 0, {}, {}, {},
                { ...emptyData, futureExpenses, categories: [{ id: 'c1', name: 'Servicios', type: 'expense' }] },
                buildContext([], currentMonthStart)
            );

            const currentResult = calculateMonthlySnapshot(
                currentMonthDate, 0, {}, {}, {},
                { ...emptyData, futureExpenses, categories: [{ id: 'c1', name: 'Servicios', type: 'expense' }] },
                buildContext([], currentMonthStart)
            );

            expect(pastResult.gastosFuturos).toBe(0);
            expect(currentResult.gastosFuturos).toBe(200);
        });

        it('does not count overdue future expense if paid in due month', () => {
            const currentMonthStart = new Date(2024, 5, 1); // June
            const currentMonthDate = new Date(2024, 5, 15); // June

            const futureExpenses = [
                { id: 'f1', payment_date: '2024-05-10', amount: 200, status: 'pending', description: 'Internet', category_id: 'c1' } as any
            ];

            const transactions: Transaction[] = [
                { id: 't1', type: 'expense', amount: 200, date: '2024-05-10', description: 'Internet', category: 'Servicios', category_id: 'c1' } as any
            ];

            const currentResult = calculateMonthlySnapshot(
                currentMonthDate, 0, {}, {}, {},
                { ...emptyData, futureExpenses, transactions, categories: [{ id: 'c1', name: 'Servicios', type: 'expense' }] },
                buildContext(transactions, currentMonthStart)
            );

            expect(currentResult.gastosFuturos).toBe(0);
        });

        it('accumulates overdue installments into current month excluding paid installments', () => {
            const currentMonthStart = new Date(2024, 5, 1); // June
            const currentMonthDate = new Date(2024, 5, 15); // June

            const transactions: Transaction[] = [
                { id: 'i1', type: 'expense', amount: 300, installments: 3, date: '2024-03-01', description: 'Compra CC', category: 'Comida', category_id: 'cFood' } as any,
                { id: 'p1', type: 'expense', amount: 100, date: '2024-05-05', description: 'Pago cuota', category: 'Comida', category_id: 'cFood' } as any
            ];

            const result = calculateMonthlySnapshot(
                currentMonthDate, 0, {}, {}, {},
                { ...emptyData, transactions, categories: [{ id: 'cFood', name: 'Comida', type: 'expense' }] },
                buildContext(transactions, currentMonthStart)
            );

            expect(result.egresosTarjeta).toBe(200);
        });

        it('does not project current installment if paid in current month', () => {
            const currentMonthStart = new Date(2024, 5, 1); // June
            const currentMonthDate = new Date(2024, 5, 15); // June
            const nextMonthDate = new Date(2024, 6, 15); // July

            const transactions: Transaction[] = [
                { id: 'i1', type: 'expense', amount: 200, installments: 2, date: '2024-06-01', description: 'Compra CC', category: 'Comida', category_id: 'cFood' } as any,
                { id: 'p1', type: 'expense', amount: 100, date: '2024-06-10', description: 'Pago cuota', category: 'Comida', category_id: 'cFood' } as any
            ];

            const currentResult = calculateMonthlySnapshot(
                currentMonthDate, 0, {}, {}, {},
                { ...emptyData, transactions, categories: [{ id: 'cFood', name: 'Comida', type: 'expense' }] },
                buildContext(transactions, currentMonthStart)
            );

            const nextResult = calculateMonthlySnapshot(
                nextMonthDate, 0, {}, {}, {},
                { ...emptyData, transactions, categories: [{ id: 'cFood', name: 'Comida', type: 'expense' }] },
                buildContext(transactions, currentMonthStart)
            );

            expect(currentResult.egresosTarjeta).toBe(0);
            expect(currentResult.egresosReales).toBe(100);
            expect(nextResult.egresosTarjeta).toBe(100);
        });
    });
});
