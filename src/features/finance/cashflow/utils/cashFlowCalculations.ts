import { startOfMonth, endOfMonth, isBefore, isAfter, format, addMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Transaction, PaymentMethod, FutureExpense } from '@/features/finance/types/financeTypes';
import type { Loan } from '@/features/finance/hooks/useLoansLogic';
import type { SavingsAccount } from '@/features/finance/hooks/useSavingsData';
import { isTransferTransaction, isBalanceAdjustment } from '@/features/finance/utils/cashflowUtils';
import { parseLocalDate } from '@/core/utils';
import { calculateMonthlyInterest, normalizeYieldPeriod } from '@/features/finance/utils/yieldUtils';

// Helper: Redondeo seguro a 2 decimales
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper: calcular cuota mensual de préstamo (sistema francés)
function calcularCuotaFrancesa(principal: number, tasaAnual: number, nMeses: number) {
    if (tasaAnual === 0) { return principal / nMeses; }
    const tasaMensual = tasaAnual / 12;
    return principal * (tasaMensual * Math.pow(1 + tasaMensual, nMeses)) / (Math.pow(1 + tasaMensual, nMeses) - 1);
}

// FutureExpense is now imported from financeTypes

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
    /**
     * Cuotas de compras a cuotas con tarjeta que vencen en el mes. INFORMATIVO: no suma en egresosTotales,
     * porque la compra ya restó completa del patrimonio el mes en que se hizo (saldo de la tarjeta en negativo).
     */
    egresosTarjeta: number;
    egresosReales: number;
    egresosAhorro: number;
    /** Ajustes manuales de saldo que subieron el saldo (p. ej. bajar la deuda de una tarjeta). */
    ingresosAjuste: number;
    /** Ajustes manuales de saldo que bajaron el saldo. */
    egresosAjuste: number;
    /** Parte del neto del mes que viene de transacciones reales (ya incluida en los saldos actuales). */
    netoReal: number;
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

const frequencyInterval = (freq?: FutureExpense['frequency']) =>
    freq === 'bimonthly' ? 2 : freq === 'quarterly' ? 3 : freq === 'semiannual' ? 6 : freq === 'yearly' ? 12 : 1;

const toLocalDate = (dateStr?: string | null) => {
    if (!dateStr) { return null; }
    return parseLocalDate(dateStr) ?? new Date(dateStr);
};

type FlowKind = 'income' | 'expense' | 'saving';

const flowKindOf = (type: string): FlowKind | null => {
    if (type === 'income') { return 'income'; }
    if (type === 'expense') { return 'expense'; }
    if (type === 'saving' || type === 'savings' || type === 'investment') { return 'saving'; }
    return null;
};

// La clave incluye el tipo: un ingreso real solo "cumple" un compromiso de ingreso, no uno de gasto.
const getProjectionKey = (kind: FlowKind, categoryId?: string | null, categoryName?: string | null, description?: string | null) => {
    return `${kind}|${categoryId || categoryName || description || 'uncategorized'}`;
};

const isInstallmentPlanExpense = (tx: Transaction) => {
    return tx.type === 'expense' && (tx.installments || 1) > 1;
};

const buildRealExpensePool = (txs: Transaction[]) => {
    const pool = new Map<string, number[]>();
    txs.forEach(tx => {
        if (isTransferTransaction(tx)) { return; }
        if (isBalanceAdjustment(tx)) { return; }
        const kind = flowKindOf(tx.type);
        if (!kind) { return; }
        if (isInstallmentPlanExpense(tx)) { return; }
        const key = getProjectionKey(kind, tx.category_id, tx.category, tx.description);
        const list = pool.get(key) ?? [];
        list.push(tx.amount);
        pool.set(key, list);
    });
    return pool;
};

/** Diferencia relativa máxima para considerar que un gasto real paga un compromiso (p. ej. cambio de precio). */
export const PAYMENT_MATCH_TOLERANCE = 0.1;

export const consumePayment = (pool: Map<string, number[]>, key: string, amount: number) => {
    const list = pool.get(key);
    if (!list || list.length === 0) { return false; }
    let idx = list.findIndex(v => Math.abs(v - amount) < 0.01);
    if (idx === -1) {
        // Solo el más cercano y dentro de la tolerancia: un gasto pequeño de la misma
        // categoría no debe marcar como pagado un compromiso grande (ni al revés).
        const maxDiff = Math.abs(amount) * PAYMENT_MATCH_TOLERANCE;
        let closestIdx = -1;
        let closestDiff = Infinity;
        for (let i = 0; i < list.length; i++) {
            const diff = Math.abs(list[i] - amount);
            if (diff <= maxDiff && diff < closestDiff) {
                closestDiff = diff;
                closestIdx = i;
            }
        }
        if (closestIdx === -1) { return false; }
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
        futureExpenses: FutureExpense[];
        categories: Category[];
    },
    context: CalculationContext
): MonthlySnapshot {
    const { currentMonthStart, lastTxDate } = context;
    const { transactions, paymentMethods, savingsAccounts, loans, futureExpenses, categories } = data;

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
    let ingresosAjuste = 0;
    let egresosAjuste = 0;

    // --- Ahorros e Intereses ---
    const newSavings: Record<string, number> = { ...prevSavings };
    savingsAccounts.forEach(acc => {
        const pmInitDate = acc.initial_date ? toLocalDate(acc.initial_date) : null;
        const hasBeenCreated = !pmInitDate || !isAfter(startOfMonth(pmInitDate), startOfMonth(date));

        if (!hasBeenCreated) {
            // FIX: Eliminamos la cuenta del registro en lugar de asignarle 0.
            // Así, en el mes que se cree, prevSavings[acc.id] será undefined 
            // y tomará correctamente el acc.balance inicial.
            delete newSavings[acc.id];
            return;
        }

        const prev = prevSavings[acc.id] !== undefined ? prevSavings[acc.id] : acc.balance;
        if (acc.estimated_yield && acc.estimated_yield > 0) {
            const interes = calculateMonthlyInterest(
                prev,
                acc.estimated_yield,
                normalizeYieldPeriod(acc.yield_period)
            );
            interesesAhorro += interes;
            newSavings[acc.id] = prev + interes;
        } else {
            newSavings[acc.id] = prev;
        }
    });

    // --- Base Balance Calculation (Initial Date aware) ---
    // FIX: Usar prevBalance === 0 es peligroso si el usuario realmente llega a un saldo de $0 en algún mes.
    // Una forma más segura de detectar la "primera iteración" es ver si los prevSavings están vacíos (ya que iniciamos el reduce con {}).
    const isFirstIteration = prevBalance === 0 && Object.keys(prevSavings).length === 0;

    let initialMonthBalance = 0;
    if (isFirstIteration) {
        paymentMethods.forEach(pm => {
            const pmInitDate = pm.initial_date ? toLocalDate(pm.initial_date) : null;
            // If the payment method starts in or before this month
            if (!pmInitDate || !isAfter(startOfMonth(pmInitDate), startOfMonth(date))) {
                initialMonthBalance += pm.balance;
            }
        });
    }
    const currentPrevBalance = isFirstIteration ? initialMonthBalance : prevBalance;
    const monthKey = getMonthKey(date);
    const monthTransactions = context.transactionsByMonth.get(monthKey) ?? [];
    const realExpensePool = buildRealExpensePool(monthTransactions);

    // --- Transacciones Reales ---
    let realSalarySum = 0;
    let realIncomeSum = 0;

    let realExpenseSum = 0;
    let realSavingSum = 0;
    // Pagos reales de préstamos del mes (salidas: cuotas que pago; entradas: cuotas que me pagan)
    let realLoanOut = 0;
    let realLoanIn = 0;

    monthTransactions.forEach(tx => {
        if (isTransferTransaction(tx)) { return; }

        // Ajuste manual de saldo: línea propia (no es salario, ni gasto, ni compromiso pagado)
        if (isBalanceAdjustment(tx)) {
            if (tx.type === 'income') {
                ingresosAjuste += tx.amount;
            } else {
                egresosAjuste += tx.amount;
            }
            return;
        }

        if (tx.type === 'income') {
            if (isLoanCategory(tx.category_id || null, tx.category, categories)) {
                realLoanIn += tx.amount;
            } else if (isSalary(tx.category_id || null, tx.category, categories)) {
                realSalarySum += tx.amount;
            } else {
                realIncomeSum += tx.amount;
            }
        } else if (tx.type === 'expense') {
            // Modelo patrimonio: una compra a cuotas resta completa en el mes en que se hace
            // (la tarjeta queda en negativo por el total); las cuotas son solo informativas.
            if (isLoanCategory(tx.category_id || null, tx.category, categories)) {
                realLoanOut += tx.amount;
            } else {
                egresosReales += tx.amount;
                realExpenseSum += tx.amount;
            }
        } else if (tx.type === 'saving' || tx.type === 'savings' || tx.type === 'investment' || isSavingCategory(tx.category_id || null, tx.category, categories)) {
            egresosAhorro += tx.amount;
            realSavingSum += tx.amount;
        }
    });
    const netoReal = realSalarySum + realIncomeSum + realLoanIn + ingresosAjuste
        - realExpenseSum - realSavingSum - realLoanOut - egresosAjuste;

    // --- Iniciar Ingresos con valores reales ---
    ingresosSalario = realSalarySum;
    otrosIngresos = realIncomeSum;

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

    // Suma un compromiso pendiente en la línea que le corresponde según su tipo.
    const addCommitment = (fe: FutureExpense) => {
        if (fe.type === 'income') {
            if (isSalary(fe.category_id, null, categories)) {
                ingresosSalario += fe.amount;
            } else {
                otrosIngresos += fe.amount;
            }
        } else if (fe.type === 'saving') {
            egresosAhorro += fe.amount;
        } else {
            gastosFuturos += fe.amount;
        }
    };
    // Vencidos sin pagar: se arrastran al mes actual (antes un ingreso vencido se sumaba como gasto).
    const overdueCommitments: FutureExpense[] = [];
    if (!isPastMonth) {
        futureExpenses.forEach(fe => {
            let matchesMonth = false;
            let dueMonthKey: string | null = null;
            if (fe.is_subscription) {
                const startD = toLocalDate(fe.start_date);
                const endD = toLocalDate(fe.end_date);
                if (startD && isBefore(endOfMonth(date), startOfMonth(startD))) { return; }
                if (endD && isAfter(startOfMonth(date), endOfMonth(endD))) { return; }
                // Sin fecha de inicio se ancla al mes actual (antes monthDiff = 0 cobraba todos los meses
                // aunque la frecuencia fuera trimestral/anual).
                const monthDiff = differenceInCalendarMonths(date, startD ?? currentMonthStart);
                const interval = frequencyInterval(fe.frequency);
                matchesMonth = monthDiff >= 0 && monthDiff % interval === 0;
                dueMonthKey = matchesMonth ? monthKey : null;
            } else if (fe.payment_date) {
                const payDate = toLocalDate(fe.payment_date);
                if (!payDate) { return; }
                dueMonthKey = format(payDate, 'yyyy-MM');
                matchesMonth = dueMonthKey === monthKey;
            }

            if (matchesMonth && dueMonthKey) {
                const key = getProjectionKey(flowKindOf(fe.type) ?? 'expense', fe.category_id, null, fe.description);
                if (!tryConsumePayment(dueMonthKey, key, fe.amount)) {
                    addCommitment(fe);
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
                const key = getProjectionKey(flowKindOf(fe.type) ?? 'expense', fe.category_id, null, fe.description);
                const paidInPast = tryConsumePayment(dueMonthKey, key, fe.amount);
                if (paidInPast) { return; }
                const paidNow = tryConsumePayment(monthKey, key, fe.amount);
                if (!paidNow) {
                    overdueCommitments.push(fe);
                }
            }
        });

        futureExpenses.forEach(fe => {
            if (!fe.is_subscription || !fe.start_date || fe.payment_date) { return; }
            const startDate = toLocalDate(fe.start_date);
            if (!startDate) { return; }
            const startD = startOfMonth(startDate);
            const endD = toLocalDate(fe.end_date);
            const endLimit = endD ? endOfMonth(endD) : endOfMonth(currentMonthStart);
            const interval = frequencyInterval(fe.frequency);
            for (let i = 0; ; i += interval) {
                const dueMonth = addMonths(startD, i);
                if (!isBefore(dueMonth, currentMonthStart)) { break; }
                if (isAfter(startOfMonth(dueMonth), endLimit)) { break; }
                const dueKey = format(dueMonth, 'yyyy-MM');
                const key = getProjectionKey(flowKindOf(fe.type) ?? 'expense', fe.category_id, null, fe.description);
                const paidInPast = tryConsumePayment(dueKey, key, fe.amount);
                if (paidInPast) { continue; }
                const paidNow = tryConsumePayment(monthKey, key, fe.amount);
                if (!paidNow) {
                    overdueCommitments.push(fe);
                }
            }
        });
    }

    // --- Préstamos (Amortización y Pagos Únicos) ---
    // Se proyecta la cuota de cada préstamo y luego se combina con los pagos reales del mes.
    let projLoanOut = 0;
    let projLoanOutInterest = 0;
    let projLoanIn = 0;
    const newLoans: Record<string, { saldo: number, cuotasRestantes: number }> = { ...prevLoans };
    loans.forEach(loan => {
        const isAmortized = (loan.installments || 0) > 1;
        const hasDueDate = !!loan.due_date;
        const dueDate = hasDueDate ? toLocalDate(loan.due_date) : null;
        const isDueDateMonth = dueDate && isSameMonth(date, dueDate);

        const prev = prevLoans[loan.id] ?? {
            saldo: loan.total_amount - (loan.paid_amount || 0),
            cuotasRestantes: isAmortized ? (loan.installments || 12) : (hasDueDate ? 1 : 12)
        };

        if (prev.saldo > 0) {
            let cuota = 0;
            let interes = 0;

            if (isAmortized && prev.cuotasRestantes > 0) {
                const tasa = loan.interest_rate / 100;
                cuota = calcularCuotaFrancesa(prev.saldo, tasa, prev.cuotasRestantes);
                interes = prev.saldo * tasa / 12;
                newLoans[loan.id] = { saldo: prev.saldo - (cuota - interes), cuotasRestantes: prev.cuotasRestantes - 1 };
            } else if (!isAmortized && hasDueDate) {
                if (isDueDateMonth) {
                    cuota = prev.saldo;
                    interes = 0; // Simple bullet loan usually handles interest at disbursement or separately, but here we treat saldo as total to pay
                    newLoans[loan.id] = { saldo: 0, cuotasRestantes: 0 };
                } else {
                    newLoans[loan.id] = prev;
                }
            } else if (!isAmortized && !hasDueDate) {
                // Fallback: if no installments and no due date, default to 12 months for safety/backward compatibility
                const tasa = loan.interest_rate / 100;
                const cuotasRestantes = prev.cuotasRestantes || 12;
                cuota = calcularCuotaFrancesa(prev.saldo, tasa, cuotasRestantes);
                interes = prev.saldo * tasa / 12;
                newLoans[loan.id] = { saldo: prev.saldo - (cuota - interes), cuotasRestantes: cuotasRestantes - 1 };
            }

            if (cuota > 0) {
                if (loan.type === 'lent') {
                    projLoanIn += cuota;
                } else {
                    projLoanOut += cuota;
                    projLoanOutInterest += interes;
                }
            }
        } else {
            newLoans[loan.id] = prev;
        }
    });

    // Meses pasados: solo lo que realmente se pagó. Mes actual y futuros: lo proyectado, pero si ya se
    // pagó más (o igual) cuenta el pago real, sin volver a sumar la cuota (antes se contaba doble en el
    // mes actual porque el pago ya está en el saldo real, y en meses pasados el pago no aparecía).
    egresosPrestamos = isPastMonth ? realLoanOut : Math.max(projLoanOut, realLoanOut);
    ingresosPrestamos = isPastMonth ? realLoanIn : Math.max(projLoanIn, realLoanIn);
    egresosPrestamosInteres = projLoanOut > 0
        ? projLoanOutInterest * Math.min(1, egresosPrestamos / projLoanOut)
        : 0;
    egresosPrestamosCapital = egresosPrestamos - egresosPrestamosInteres;

    // --- Tarjetas (Multi-cuota, informativo) ---
    // Cuotas que vencen este mes. No consumen pagos reales (el pago de la tarjeta es una transferencia)
    // ni restan del saldo: la compra ya restó completa cuando se hizo.
    const newCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }> = { ...prevCardInstallments };
    if (!isPastMonth) {
        transactions.filter(isInstallmentPlanExpense).forEach(tx => {
            const totalInstallments = tx.installments || 1;
            const startDate = toLocalDate(tx.date);
            if (!startDate) { return; }
            const pm = paymentMethods.find(p => p.id === tx.payment_method_id);
            if (pm?.type && pm.type !== 'credit') { return; }
            const idx = differenceInCalendarMonths(date, startOfMonth(startDate));
            if (idx < 0 || idx >= totalInstallments) { return; }
            const valorCuota = tx.amount / totalInstallments;
            egresosTarjeta += valorCuota;
            newCardInstallments[tx.id] = {
                restantes: totalInstallments - idx - 1,
                valorCuota,
                interes: 0,
                capital: valorCuota,
            };
        });
    }

    if (isCurrentMonth) {
        overdueCommitments.forEach(addCommitment);
    }

    const ingresosTotales = ingresosSalario + interesesAhorro + otrosIngresos + ingresosPrestamos + ingresosAjuste;
    // egresosTarjeta no suma: es informativo (ver MonthlySnapshot.egresosTarjeta).
    const egresosTotales = gastosFuturos + egresosPrestamos + egresosReales + egresosAhorro + egresosAjuste;
    const balanceNetoMes = ingresosTotales - egresosTotales;
    const balanceAcumulado = currentPrevBalance + balanceNetoMes;

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
        ingresosAjuste: round(ingresosAjuste),
        egresosAjuste: round(egresosAjuste),
        netoReal: round(netoReal),
        balanceNetoMes: round(balanceNetoMes),
        balanceAcumulado: round(balanceAcumulado),
        newSavings, newLoans, newCardInstallments,
    };
}

/**
 * Desplazamiento que ancla el saldo acumulado al saldo real de hoy.
 * - Mes actual en la ventana: fin de mes = saldo real + lo que falta por ocurrir (neto − netoReal).
 *   Las transacciones reales del mes ya están en el saldo real, así que no se suman otra vez.
 * - Sin mes actual: el último mes histórico queda igual al saldo real (comportamiento previo).
 */
export function computeBalanceAnchorOffset(
    rows: Pick<MonthlySnapshot, 'balanceAcumulado' | 'balanceNetoMes' | 'netoReal'>[],
    currentMonthIdx: number,
    balanceActual: number,
    lastHistoricalRaw: number | null
): number {
    if (currentMonthIdx >= 0 && rows[currentMonthIdx]) {
        const row = rows[currentMonthIdx];
        const pendingThisMonth = row.balanceNetoMes - row.netoReal;
        return round(balanceActual + pendingThisMonth - row.balanceAcumulado);
    }
    return lastHistoricalRaw !== null ? round(balanceActual - lastHistoricalRaw) : 0;
}
