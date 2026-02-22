import { startOfMonth, endOfMonth, isBefore, isAfter, format, addMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Transaction, Budget, PaymentMethod } from '@/features/finance/types/financeTypes';
import type { Loan } from '@/features/finance/hooks/useLoansLogic';
import type { SavingsAccount } from '@/features/finance/hooks/useSavingsData';
import { isTransferTransaction } from '@/lib/cashflowUtils';
import { parseLocalDate } from '@/core/utils';

// Helper: Redondeo seguro a 2 decimales
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper: calcular cuota mensual de préstamo (sistema francés)
function calcularCuotaFrancesa(principal: number, tasaAnual: number, nMeses: number) {
    if (tasaAnual === 0) { return principal / nMeses; }
    const tasaMensual = tasaAnual / 12;
    return principal * (tasaMensual * Math.pow(1 + tasaMensual, nMeses)) / (Math.pow(1 + tasaMensual, nMeses) - 1);
}

export interface FutureExpense {
    id: string;
    payment_date: string;
    amount: number;
    description: string;
    category_id: string | null;
    status: 'pending' | 'paid';
    is_subscription?: boolean;
    payment_day?: number;
    start_date?: string;
    end_date?: string;
    frequency?: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly';
}

export interface MonthlySnapshot {
    mes: string;
    ingresosTotales: number;
    ingresosSalario: number;
    interesesAhorro: number;
    ingresosPrestamos: number;
    otrosIngresos: number;
    egresosTotales: number;
    gastosFuturos: number;
    egresosPrestamos: number;
    egresosPrestamosInteres: number;
    egresosPrestamosCapital: number;
    egresosTarjeta: number;
    egresosReales: number;
    egresosAhorro: number;
    balanceNetoMes: number;
    balanceAcumulado: number;
    newSavings: Record<string, number>;
    newLoans: Record<string, { saldo: number, cuotasRestantes: number }>;
    newCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }>;
}

interface Category {
    id: string;
    name: string;
    type: string;
}

interface CalculationContext {
    currentMonthStart: Date;
    lastTxDate: Date;
    categories: Category[];
    transactionsByMonth: Map<string, Transaction[]>;
}

export const differenceInCalendarMonths = (dateLeft: Date, dateRight: Date) => {
    return (dateLeft.getFullYear() - dateRight.getFullYear()) * 12 + (dateLeft.getMonth() - dateRight.getMonth());
};

const isSalary = (catId: string | null, catName: string | undefined, categories: Category[]) => {
    const name = (catName || categories.find(c => c.id === catId)?.name || '').toLowerCase();
    return name.includes('salario') || name.includes('sueldo') || name.includes('nómina');
};

const isLoanCategory = (catId: string | null, catName: string | undefined, categories: Category[]) => {
    const name = (catName || categories.find(c => c.id === catId)?.name || '').toLowerCase();
    return name.includes('préstamo') || name.includes('credito hipotecario') || name.includes('deuda');
};

const isSavingCategory = (catId: string | null, catName: string | undefined, categories: Category[]) => {
    const name = (catName || categories.find(c => c.id === catId)?.name || '').toLowerCase();
    return name.includes('ahorro') || name.includes('inversión') || name.includes('saving');
};

const getMonthKey = (date: Date) => format(date, 'yyyy-MM');

const toLocalDate = (dateStr?: string | null) => {
    if (!dateStr) { return null; }
    return parseLocalDate(dateStr) ?? new Date(dateStr);
};

const getProjectionKey = (categoryId?: string | null, categoryName?: string | null, description?: string | null) => {
    return categoryId || categoryName || description || 'uncategorized';
};

const isInstallmentPlanExpense = (tx: Transaction) => {
    return tx.type === 'expense' && (tx.installments || 1) > 1;
};

const buildRealExpensePool = (txs: Transaction[]) => {
    const pool = new Map<string, number[]>();
    txs.forEach(tx => {
        if (isTransferTransaction(tx)) { return; }
        if (tx.type !== 'expense') { return; }
        if (isInstallmentPlanExpense(tx)) { return; }
        const key = getProjectionKey(tx.category_id, tx.category, tx.description);
        const list = pool.get(key) ?? [];
        list.push(tx.amount);
        pool.set(key, list);
    });
    return pool;
};

const consumePayment = (pool: Map<string, number[]>, key: string, amount: number) => {
    const list = pool.get(key);
    if (!list || list.length === 0) { return false; }
    let idx = list.findIndex(v => Math.abs(v - amount) < 0.01);
    if (idx === -1) {
        let closestIdx = 0;
        let closestDiff = Math.abs(list[0] - amount);
        for (let i = 1; i < list.length; i++) {
            const diff = Math.abs(list[i] - amount);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestIdx = i;
            }
        }
        idx = closestIdx;
    }
    list.splice(idx, 1);
    pool.set(key, list);
    return true;
};

export function calculateMonthlySnapshot(
    date: Date,
    prevBalance: number,
    prevSavings: Record<string, number>,
    prevLoans: Record<string, { saldo: number, cuotasRestantes: number }>,
    prevCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }>,
    data: {
        transactions: Transaction[];
        paymentMethods: PaymentMethod[];
        savingsAccounts: SavingsAccount[];
        loans: Loan[];
        budgets: Budget[];
        futureExpenses: FutureExpense[];
        categories: Category[];
        incomeMode: 'real' | 'projected';
    },
    context: CalculationContext
): MonthlySnapshot {
    const { currentMonthStart, lastTxDate } = context;
    const { transactions, paymentMethods, savingsAccounts, loans, budgets, futureExpenses, categories, incomeMode } = data;

    const isPastMonth = isBefore(endOfMonth(date), currentMonthStart);
    const isCurrentMonth = isSameMonth(startOfMonth(date), currentMonthStart);
    const isFutureRelativeToIncome = isAfter(startOfMonth(date), startOfMonth(lastTxDate));

    let ingresosSalario = 0;
    let interesesAhorro = 0;
    let ingresosPrestamos = 0;
    let otrosIngresos = 0;

    let gastosFuturos = 0;
    let egresosPrestamos = 0;
    let egresosPrestamosInteres = 0;
    let egresosPrestamosCapital = 0;
    let egresosTarjeta = 0;
    let egresosReales = 0;
    let egresosAhorro = 0;

    // --- Ahorros e Intereses ---
    const newSavings: Record<string, number> = { ...prevSavings };
    savingsAccounts.forEach(acc => {
        const prev = prevSavings[acc.id] ?? acc.balance;
        if (acc.estimated_yield && acc.estimated_yield > 0) {
            const interes = prev * (Math.pow(1 + acc.estimated_yield, 1 / 12) - 1);
            interesesAhorro += interes;
            newSavings[acc.id] = prev + interes;
        } else {
            newSavings[acc.id] = prev;
        }
    });

    const monthKey = getMonthKey(date);
    const monthTransactions = context.transactionsByMonth.get(monthKey) ?? [];
    const realExpensePool = buildRealExpensePool(monthTransactions);

    // --- Transacciones Reales ---
    let realSalarySum = 0;
    let realIncomeSum = 0;

    monthTransactions.forEach(tx => {
        if (isTransferTransaction(tx)) { return; }

        if (tx.type === 'income') {
            if (isSalary(tx.category_id || null, tx.category, categories)) {
                realSalarySum += tx.amount;
            } else {
                realIncomeSum += tx.amount;
            }
        } else if (tx.type === 'expense') {
            const isMultiCuota = (tx.installments || 1) > 1;
            const isLoanPayment = isLoanCategory(tx.category_id || null, tx.category, categories);
            if (!isMultiCuota && !isLoanPayment) {
                egresosReales += tx.amount;
            }
        } else if (tx.type === 'saving' || tx.type === 'investment' || isSavingCategory(tx.category_id || null, tx.category, categories)) {
            egresosAhorro += tx.amount;
        }
    });

    // --- Presupuesto ---
    let budgetedSalary = 0;
    let budgetedOther = 0;
    budgets.forEach(b => {
        if (b.month && b.month.substring(0, 7) !== monthKey) { return; }
        const cat = categories.find(c => c.id === b.category_id);
        if (cat?.type === 'income') {
            if (isSalary(b.category_id || null, cat.name, categories)) {
                budgetedSalary += b.amount;
            } else {
                budgetedOther += b.amount;
            }
        }
    });

    // --- Asignación Final de Ingresos (Separando real vs proyección) ---
    const salaryProjected = isPastMonth
        ? 0
        : Math.max(0, budgetedSalary - realSalarySum);
    const otherProjected = (incomeMode === 'projected' && isFutureRelativeToIncome)
        ? budgetedOther
        : 0;

    ingresosSalario = isPastMonth ? realSalarySum : (realSalarySum + salaryProjected);
    otrosIngresos = isPastMonth ? realIncomeSum : (realIncomeSum + (isCurrentMonth ? Math.max(0, budgetedOther - realIncomeSum) : otherProjected));

    // --- Future Expenses (Proyección) ---
    const pastPoolsCache = new Map<string, Map<string, number[]>>();
    const getPastPool = (key: string) => {
        const existing = pastPoolsCache.get(key);
        if (existing) { return existing; }
        const pool = buildRealExpensePool(context.transactionsByMonth.get(key) ?? []);
        pastPoolsCache.set(key, pool);
        return pool;
    };

    const tryConsumePayment = (monthKeyToCheck: string, key: string, amount: number) => {
        const pool = monthKeyToCheck === monthKey ? realExpensePool : getPastPool(monthKeyToCheck);
        return consumePayment(pool, key, amount);
    };

    let overdueFutureExpenses = 0;
    if (!isPastMonth) {
        futureExpenses.forEach(fe => {
            let matchesMonth = false;
            let dueMonthKey: string | null = null;
            if (fe.is_subscription) {
                const startD = toLocalDate(fe.start_date);
                const endD = toLocalDate(fe.end_date);
                if (startD && isBefore(endOfMonth(date), startOfMonth(startD))) { return; }
                if (endD && isAfter(startOfMonth(date), endOfMonth(endD))) { return; }
                const monthDiff = startD ? differenceInCalendarMonths(date, startD) : 0;
                const freq = fe.frequency || 'monthly';
                const interval = freq === 'bimonthly' ? 2 : freq === 'quarterly' ? 3 : freq === 'semiannual' ? 6 : freq === 'yearly' ? 12 : 1;
                matchesMonth = monthDiff % interval === 0;
                dueMonthKey = matchesMonth ? monthKey : null;
            } else if (fe.payment_date) {
                const payDate = toLocalDate(fe.payment_date);
                if (!payDate) { return; }
                dueMonthKey = format(payDate, 'yyyy-MM');
                matchesMonth = dueMonthKey === monthKey;
            }

            if (matchesMonth && dueMonthKey) {
                const key = getProjectionKey(fe.category_id, null, fe.description);
                if (!tryConsumePayment(dueMonthKey, key, fe.amount)) {
                    gastosFuturos += fe.amount;
                }
            }
        });
    }

    if (isCurrentMonth) {
        futureExpenses.forEach(fe => {
            if (fe.payment_date) {
                const payDate = toLocalDate(fe.payment_date);
                if (!payDate) { return; }
                if (!isBefore(payDate, currentMonthStart)) { return; }
                const dueMonthKey = format(payDate, 'yyyy-MM');
                const key = getProjectionKey(fe.category_id, null, fe.description);
                const paidInPast = tryConsumePayment(dueMonthKey, key, fe.amount);
                if (paidInPast) { return; }
                const paidNow = tryConsumePayment(monthKey, key, fe.amount);
                if (!paidNow) {
                    overdueFutureExpenses += fe.amount;
                }
            }
        });

        futureExpenses.forEach(fe => {
            if (!fe.is_subscription || !fe.start_date || fe.payment_date) { return; }
            const startDate = toLocalDate(fe.start_date);
            if (!startDate) { return; }
            const startD = startOfMonth(startDate);
            const endLimit = fe.end_date ? endOfMonth(new Date(fe.end_date)) : endOfMonth(currentMonthStart);
            const freq = fe.frequency || 'monthly';
            const interval = freq === 'bimonthly' ? 2 : freq === 'quarterly' ? 3 : freq === 'semiannual' ? 6 : freq === 'yearly' ? 12 : 1;
            for (let i = 0; ; i += interval) {
                const dueMonth = addMonths(startD, i);
                if (!isBefore(dueMonth, currentMonthStart)) { break; }
                if (isAfter(startOfMonth(dueMonth), endLimit)) { break; }
                const dueKey = format(dueMonth, 'yyyy-MM');
                const key = getProjectionKey(fe.category_id, null, fe.description);
                const paidInPast = tryConsumePayment(dueKey, key, fe.amount);
                if (paidInPast) { continue; }
                const paidNow = tryConsumePayment(monthKey, key, fe.amount);
                if (!paidNow) {
                    overdueFutureExpenses += fe.amount;
                }
            }
        });
    }

    // --- Préstamos (Amortización) ---
    const newLoans: Record<string, { saldo: number, cuotasRestantes: number }> = { ...prevLoans };
    loans.forEach(loan => {
        const prev = prevLoans[loan.id] ?? { saldo: loan.total_amount - (loan.paid_amount || 0), cuotasRestantes: loan.installments || 12 };
        if (prev.saldo > 0 && prev.cuotasRestantes > 0) {
            const tasa = loan.interest_rate;
            const cuota = calcularCuotaFrancesa(prev.saldo, tasa, prev.cuotasRestantes);
            const interes = prev.saldo * tasa / 12;
            if (!isPastMonth) {
                if (loan.type === 'lent') {
                    ingresosPrestamos += cuota;
                } else {
                    egresosPrestamos += cuota;
                    egresosPrestamosInteres += interes;
                    egresosPrestamosCapital += cuota - interes;
                }
            }
            newLoans[loan.id] = { saldo: prev.saldo - (cuota - interes), cuotasRestantes: prev.cuotasRestantes - 1 };
        } else {
            newLoans[loan.id] = prev;
        }
    });

    // --- Tarjetas (Multi-cuota) ---
    const newCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }> = { ...prevCardInstallments };
    let overdueInstallments = 0;
    transactions.filter(tx => tx.type === 'expense' && (tx.installments || 1) > 1).forEach(tx => {
        const totalInstallments = tx.installments || 1;
        const installmentAmount = tx.amount / totalInstallments;
        const startDate = toLocalDate(tx.date);
        if (!startDate) { return; }
        const startMonth = startOfMonth(startDate);
        const pm = paymentMethods.find(p => p.id === tx.payment_method_id);
        if (pm?.type && pm.type !== 'credit') { return; }

        for (let i = 0; i < totalInstallments; i++) {
            const dueMonth = addMonths(startMonth, i);
            const dueKey = format(dueMonth, 'yyyy-MM');
            const isPastDue = isBefore(dueMonth, currentMonthStart);
            const isSameAsCurrent = isSameMonth(dueMonth, currentMonthStart);

            const key = getProjectionKey(tx.category_id, tx.category, tx.description);

            if (isPastDue) {
                if (isCurrentMonth) {
                    const paidInPast = tryConsumePayment(dueKey, key, installmentAmount);
                    if (paidInPast) { continue; }
                    const paidNow = tryConsumePayment(monthKey, key, installmentAmount);
                    if (!paidNow) {
                        overdueInstallments += installmentAmount;
                    }
                }
                continue;
            }

            if (!isPastMonth && (isSameAsCurrent ? isCurrentMonth : true) && dueKey === monthKey) {
                const paid = tryConsumePayment(dueKey, key, installmentAmount);
                if (!paid) {
                    egresosTarjeta += installmentAmount;
                }
            }
        }
    });

    if (isCurrentMonth) {
        egresosTarjeta += overdueInstallments;
        gastosFuturos += overdueFutureExpenses;
    }

    const ingresosTotales = ingresosSalario + interesesAhorro + otrosIngresos + ingresosPrestamos;
    const egresosTotales = gastosFuturos + egresosPrestamos + egresosTarjeta + egresosReales + egresosAhorro;
    const balanceNetoMes = ingresosTotales - egresosTotales;
    const balanceAcumulado = prevBalance + balanceNetoMes;

    return {
        mes: format(date, 'MMMM yyyy', { locale: es }),
        ingresosTotales: round(ingresosTotales),
        ingresosSalario: round(ingresosSalario),
        interesesAhorro: round(interesesAhorro),
        ingresosPrestamos: round(ingresosPrestamos),
        otrosIngresos: round(otrosIngresos),
        egresosTotales: round(egresosTotales),
        gastosFuturos: round(gastosFuturos),
        egresosPrestamos: round(egresosPrestamos),
        egresosPrestamosInteres: round(egresosPrestamosInteres),
        egresosPrestamosCapital: round(egresosPrestamosCapital),
        egresosTarjeta: round(egresosTarjeta),
        egresosReales: round(egresosReales),
        egresosAhorro: round(egresosAhorro),
        balanceNetoMes: round(balanceNetoMes),
        balanceAcumulado: round(balanceAcumulado),
        newSavings, newLoans, newCardInstallments,
    };
}
