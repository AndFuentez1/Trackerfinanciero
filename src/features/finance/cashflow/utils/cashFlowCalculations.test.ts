import { describe, it, expect, vi } from 'vitest';
import { calculateMonthlySnapshot, computeBalanceAnchorOffset, consumePayment, differenceInCalendarMonths, MonthlySnapshot } from './cashFlowCalculations';
import { addMonths, startOfMonth } from 'date-fns';
import type { Transaction, PaymentMethod, Budget, FutureExpense } from '@/features/finance/types/financeTypes';
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

    describe('computeBalanceAnchorOffset', () => {
        it('does not double count real movements of the current month (e.g. a card adjustment)', () => {
            // Mes anterior: raw 1000. Mes actual: ajuste real +4500 y un gasto futuro pendiente de -200.
            const rows = [
                { balanceAcumulado: 1000, balanceNetoMes: 0, netoReal: 0 },
                { balanceAcumulado: 5300, balanceNetoMes: 4300, netoReal: 4500 },
            ];
            const balanceActual = 10000; // ya incluye el ajuste de +4500
            const offset = computeBalanceAnchorOffset(rows, 1, balanceActual, 1000);

            // Fin del mes actual = saldo real − lo pendiente (200); mes anterior = saldo real − ajuste del mes
            expect(rows[1].balanceAcumulado + offset).toBe(9800);
            expect(rows[0].balanceAcumulado + offset).toBe(5500);
        });

        it('falls back to the last historical month when the current month is not in the window', () => {
            expect(computeBalanceAnchorOffset([{ balanceAcumulado: 300, balanceNetoMes: 0, netoReal: 0 }], -1, 1000, 300)).toBe(700);
            expect(computeBalanceAnchorOffset([], -1, 1000, null)).toBe(0);
        });
    });

    describe('consumePayment', () => {
        it('does not match a commitment with an unrelated amount of the same category', () => {
            const pool = new Map([['cat', [20]]]);
            expect(consumePayment(pool, 'cat', 1000)).toBe(false);
            expect(pool.get('cat')).toEqual([20]);
        });
        it('matches the closest amount within tolerance (price change)', () => {
            const pool = new Map([['cat', [20, 1050]]]);
            expect(consumePayment(pool, 'cat', 1000)).toBe(true);
            expect(pool.get('cat')).toEqual([20]);
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

        const fe = (over: Partial<FutureExpense>): FutureExpense => ({
            id: 'fe', payment_date: '', amount: 100, description: 'Compromiso', category_id: null,
            type: 'expense', status: 'pending', ...over,
        });

        it('projects saving commitments as savings outflow, not future expenses', () => {
            const futureExpenses = [fe({ type: 'saving', payment_date: '2024-07-05', amount: 300 })];
            const result = calculateMonthlySnapshot(
                new Date(2024, 6, 1), 0, {}, {}, {},
                { ...emptyData, futureExpenses }, buildContext([])
            );
            expect(result.egresosAhorro).toBe(300);
            expect(result.gastosFuturos).toBe(0);
        });

        it('does not charge a yearly subscription without start_date every month', () => {
            const futureExpenses = [fe({ is_subscription: true, frequency: 'yearly', amount: 120 })];
            const months = [0, 1, 2, 11, 12].map(i => calculateMonthlySnapshot(
                addMonths(new Date(2024, 5, 1), i), 0, {}, {}, {},
                { ...emptyData, futureExpenses }, buildContext([])
            ).gastosFuturos);
            expect(months).toEqual([120, 0, 0, 0, 120]);
        });

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
                { id: '1', type: 'income', amount: 1000, date: '2024-06-10', description: 'Salary', category: 'Salario' } as never
            ];
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {},
                { ...emptyData, transactions, categories: [{ id: 'c1', name: 'Salario', type: 'income' }] },
                buildContext(transactions as Transaction[])
            );

            expect(result.ingresosTotales).toBe(1000);
            expect(result.ingresosSalario).toBe(1000);
        });

        it('reports balance adjustments on their own line and in netoReal', () => {
            const transactions = [
                { id: 'a1', type: 'income', amount: 4500, date: '2024-06-10', description: 'Ajuste manual de saldo - Visa', category: 'Ajuste de saldo', payment_method_id: 'card' },
                { id: 'a2', type: 'expense', amount: 300, date: '2024-06-11', description: 'Ajuste manual de saldo - Débito', category: 'Ajuste de saldo', payment_method_id: 'deb' },
                { id: 'e1', type: 'expense', amount: 200, date: '2024-06-12', description: 'Food', category: 'Comida' },
            ] as unknown as Transaction[];
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {},
                { ...emptyData, transactions },
                buildContext(transactions)
            );

            expect(result.ingresosAjuste).toBe(4500);
            expect(result.egresosAjuste).toBe(300);
            expect(result.otrosIngresos).toBe(0);
            expect(result.egresosReales).toBe(200);
            expect(result.ingresosTotales).toBe(4500);
            expect(result.egresosTotales).toBe(500);
            expect(result.netoReal).toBe(4000);
            expect(result.balanceNetoMes).toBe(4000);
        });

        it("counts DB type 'savings' as savings outflow", () => {
            const transactions = [
                { id: 's1', type: 'savings', amount: 700, date: '2024-06-10', description: 'CDT', category: 'Inversión CDT' },
                { id: 's2', type: 'savings', amount: 100, date: '2024-06-11', description: 'Bolsillo', category: 'Bolsillo' },
            ] as unknown as Transaction[];
            const result = calculateMonthlySnapshot(
                baseDate, 0, {}, {}, {},
                { ...emptyData, transactions },
                buildContext(transactions)
            );

            expect(result.egresosAhorro).toBe(800);
            expect(result.netoReal).toBe(-800);
        });

        it('calculates real expenses from transactions', () => {
            const transactions: Transaction[] = [
                { id: '1', type: 'expense', amount: 500, date: '2024-06-10', description: 'Food', category: 'Comida' } as never
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
                { id: 'f1', payment_date: '2024-07-15', amount: 200, status: 'pending', description: 'Bill', category_id: null } as never
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
                { id: 'f1', payment_date: '2024-05-10', amount: 200, status: 'pending', description: 'Internet', category_id: 'c1' } as never
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
                { id: 'f1', payment_date: '2024-05-10', amount: 200, status: 'pending', description: 'Internet', category_id: 'c1' } as never
            ];

            const transactions: Transaction[] = [
                { id: 't1', type: 'expense', amount: 200, date: '2024-05-10', description: 'Internet', category: 'Servicios', category_id: 'c1' } as never
            ];

            const currentResult = calculateMonthlySnapshot(
                currentMonthDate, 0, {}, {}, {},
                { ...emptyData, futureExpenses, transactions, categories: [{ id: 'c1', name: 'Servicios', type: 'expense' }] },
                buildContext(transactions, currentMonthStart)
            );

            expect(currentResult.gastosFuturos).toBe(0);
        });

        it('patrimony model: installment purchase counts in full in its month; installments are informative', () => {
            const currentMonthStart = new Date(2024, 5, 1); // June
            const transactions: Transaction[] = [
                { id: 'i1', type: 'expense', amount: 300, installments: 3, date: '2024-06-01', description: 'Compra CC', category: 'Comida', category_id: 'cFood' } as never,
            ];
            const data = { ...emptyData, transactions, categories: [{ id: 'cFood', name: 'Comida', type: 'expense' }] };

            const june = calculateMonthlySnapshot(new Date(2024, 5, 15), 0, {}, {}, {}, data, buildContext(transactions, currentMonthStart));
            const july = calculateMonthlySnapshot(new Date(2024, 6, 15), 0, {}, {}, {}, data, buildContext(transactions, currentMonthStart));
            const sept = calculateMonthlySnapshot(new Date(2024, 8, 15), 0, {}, {}, {}, data, buildContext(transactions, currentMonthStart));

            expect(june.egresosReales).toBe(300);
            expect(june.netoReal).toBe(-300);
            expect(june.egresosTarjeta).toBe(100);
            expect(june.egresosTotales).toBe(300);
            expect(july.egresosTarjeta).toBe(100);
            expect(july.egresosTotales).toBe(0);
            expect(sept.egresosTarjeta).toBe(0);
        });

        it('installments do not consume a real expense that pays a commitment', () => {
            const currentMonthStart = new Date(2024, 5, 1);
            const transactions: Transaction[] = [
                { id: 'i1', type: 'expense', amount: 200, installments: 2, date: '2024-06-01', description: 'Compra CC', category_id: 'c1' } as never,
                { id: 'p1', type: 'expense', amount: 100, date: '2024-06-10', description: 'Internet', category_id: 'c1' } as never,
            ];
            const futureExpenses = [
                { id: 'f1', payment_date: '2024-06-10', amount: 100, status: 'pending', description: 'Internet', category_id: 'c1', type: 'expense' } as never,
            ];
            const result = calculateMonthlySnapshot(
                new Date(2024, 5, 15), 0, {}, {}, {},
                { ...emptyData, transactions, futureExpenses }, buildContext(transactions, currentMonthStart)
            );
            expect(result.gastosFuturos).toBe(0);
        });

        it('overdue income commitments are carried as income, not expense', () => {
            const currentMonthStart = new Date(2024, 5, 1);
            const futureExpenses = [
                { id: 'f1', payment_date: '2024-05-10', amount: 500, status: 'pending', description: 'Arriendo cobrado', category_id: null, type: 'income' } as never,
            ];
            const result = calculateMonthlySnapshot(
                new Date(2024, 5, 15), 0, {}, {}, {},
                { ...emptyData, futureExpenses }, buildContext([], currentMonthStart)
            );
            expect(result.gastosFuturos).toBe(0);
            expect(result.otrosIngresos).toBe(500);
        });

        describe('real loan payments', () => {
            const loan: Loan = {
                id: 'l1', name: 'Crédito', total_amount: 1200, paid_amount: 0, interest_rate: 0,
                user_id: 'u1', type: 'borrowed', created_at: '', due_date: null, payment_method_id: null,
                installments: 12
            } as Loan;
            const categories = [{ id: 'cLoan', name: 'Préstamo', type: 'expense' }];
            const paid: Transaction[] = [
                { id: 'lp', type: 'expense', amount: 100, date: '2024-06-05', description: 'Cuota', category_id: 'cLoan' } as never,
            ];

            it('counts real payments in past months (were omitted)', () => {
                const result = calculateMonthlySnapshot(
                    new Date(2024, 5, 15), 0, {}, {}, {},
                    { ...emptyData, loans: [loan], transactions: paid, categories },
                    buildContext(paid, new Date(2024, 7, 1))
                );
                expect(result.egresosPrestamos).toBe(100);
                expect(result.netoReal).toBe(-100);
            });

            it('does not project the installment again when already paid this month', () => {
                const result = calculateMonthlySnapshot(
                    new Date(2024, 5, 15), 0, {}, {}, {},
                    { ...emptyData, loans: [loan], transactions: paid, categories },
                    buildContext(paid, new Date(2024, 5, 1))
                );
                expect(result.egresosPrestamos).toBe(100);
                // Lo pendiente del mes (neto − netoReal) es 0: la cuota ya está en el saldo real
                expect(result.balanceNetoMes - result.netoReal).toBe(0);
            });
        });
    });
});
