
import { useMemo, useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLoans } from '@/contexts/LoansContext';
import { useBudgetsData } from './useBudgetsData';
import { useSavingsData } from './useSavingsData';
import { addMonths, startOfMonth, format, isBefore, isAfter, endOfMonth, setDate, getDate, isSameMonth } from 'date-fns';
import { CashFlowPoint } from '@/features/cashflow/components/cashflow.types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isTransferTransaction } from '@/lib/cashflowUtils';
import { es } from 'date-fns/locale';

// Helper: Redondeo seguro a 2 decimales para evitar errores de punto flotante
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

// Helper: calcular cuota mensual de préstamo (sistema francés)
function calcularCuotaFrancesa(principal: number, tasaAnual: number, nMeses: number) {
  if (tasaAnual === 0) return principal / nMeses;
  const tasaMensual = tasaAnual / 12;
  return principal * (tasaMensual * Math.pow(1 + tasaMensual, nMeses)) / (Math.pow(1 + tasaMensual, nMeses) - 1);
}

interface FutureExpense {
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

export function useCashFlow(year: number, month: number | 'all', range: 'mes' | '6m' | 'año') {
  // ... (hooks remain same)
  const { user } = useAuth();
  const { transactions, paymentMethods, categories } = useFinance();
  const { loans } = useLoans();
  const { budgets } = useBudgetsData();
  const { savingsAccounts } = useSavingsData();
  const [futureExpenses, setFutureExpenses] = useState<FutureExpense[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchFE = async () => {
      const { data } = await supabase
        .from('future_expenses')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'paid');
      if (data) setFutureExpenses(data as FutureExpense[]);
    };
    fetchFE();
    const channel = supabase
      .channel('cf_future_expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'future_expenses', filter: `user_id=eq.${user.id}` }, fetchFE)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Balance actual por cuentas
  const balance_actual = useMemo(() => {
    return round(paymentMethods.reduce((sum, acc) => sum + (acc.balance || 0), 0));
  }, [paymentMethods]);

  // Fechas de proyección
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const start = month === 'all'
    ? startOfMonth(new Date(year, 0, 1))
    : startOfMonth(new Date(year, Number(month) - 1, 1));
  const monthsCount = range === 'mes' ? 1 : range === '6m' ? 6 : 12;
  const monthStart = month === 'all' ? 0 : (Number(month) - 1);

  // Importante: para calculo de diferencias de meses
  const differenceInCalendarMonths = (dateLeft: Date, dateRight: Date) => {
    return (dateLeft.getFullYear() - dateRight.getFullYear()) * 12 + (dateLeft.getMonth() - dateRight.getMonth());
  };

  // --- Cálculo detallado mensual avanzado ---
  function calculateMonthlySnapshot(date: Date, prevBalance: number, prevSavings: Record<string, number>, prevLoans: Record<string, { saldo: number, cuotasRestantes: number }>, prevCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }>) {
    const isPastMonth = isBefore(endOfMonth(date), currentMonthStart);

    // Ingresos
    let ingresosSalario = 0;
    let interesesAhorro = 0;
    let otrosIngresos = 0;
    // Egresos
    let gastosFuturos = 0; // Presupuestos + Future Expenses
    let egresosPrestamos = 0;
    let egresosPrestamosInteres = 0;
    let egresosPrestamosCapital = 0;
    let egresosTarjeta = 0;
    const egresosTarjetaInteres = 0;
    const egresosTarjetaCapital = 0;
    let egresosReales = 0;

    // --- Saldo de ahorros e intereses compuestos ---
    const newSavings: Record<string, number> = { ...prevSavings };
    savingsAccounts.forEach(acc => {
      const prev = prevSavings[acc.id] ?? acc.balance;
      let interes = 0;
      if (acc.estimated_yield && acc.estimated_yield > 0) {
        interes = prev * (Math.pow(1 + acc.estimated_yield, 1 / 12) - 1);
        interesesAhorro += interes;
        newSavings[acc.id] = prev + interes;
      } else {
        newSavings[acc.id] = prev;
      }
    });

    // --- Ingresos proyectados (Removido: Solo transacciones reales o FE) ---
    // (Anteriormente usaba budgets para proyecciones de ingresos)

    // --- Gastos presupuestados (Removido: No proyectar metas, solo obligaciones) ---
    // (Anteriormente usaba budgets para proyecciones de gastos)

    // --- Future Expenses & Subscriptions ---
    if (!isPastMonth) {
      futureExpenses.forEach(fe => {
        let matchesMonth = false;

        if (fe.is_subscription) {
          const startD = fe.start_date ? new Date(fe.start_date) : null;
          const endD = fe.end_date ? new Date(fe.end_date) : null;

          // Check validity range
          if (startD && isBefore(endOfMonth(date), startOfMonth(startD))) return;
          if (endD && isAfter(startOfMonth(date), endOfMonth(endD))) return;

          // Check Frequency
          const freq = fe.frequency || 'monthly';
          const monthDiff = startD ? differenceInCalendarMonths(date, startD) : 0;

          switch (freq) {
            case 'monthly':
              matchesMonth = true;
              break;
            case 'bimonthly':
              matchesMonth = monthDiff % 2 === 0;
              break;
            case 'quarterly':
              matchesMonth = monthDiff % 3 === 0;
              break;
            case 'semiannual':
              matchesMonth = monthDiff % 6 === 0;
              break;
            case 'yearly':
              matchesMonth = monthDiff % 12 === 0;
              break;
            default:
              matchesMonth = true;
          }
        } else {
          // One-time expense
          const payDate = new Date(fe.payment_date);
          if (format(payDate, 'yyyy-MM') === format(date, 'yyyy-MM')) {
            matchesMonth = true;
          }
        }

        if (matchesMonth) {
          gastosFuturos += fe.amount;
        }
      });
    }

    // --- Préstamos: amortización francesa real ---
    const newLoans: Record<string, { saldo: number, cuotasRestantes: number }> = { ...prevLoans };

    // Calcular ingresos por préstamos que me deben (Type = 'lent')
    let ingresoPrestamoMes = 0;

    loans.forEach(loan => {
      const prev = prevLoans[loan.id] ?? { saldo: loan.total_amount - (loan.paid_amount || 0), cuotasRestantes: loan.installments || 12 };

      if (prev.saldo > 0 && prev.cuotasRestantes > 0) {
        const tasa = loan.interest_rate;
        const cuota = calcularCuotaFrancesa(prev.saldo, tasa, prev.cuotasRestantes);
        const interes = prev.saldo * tasa / 12;

        if (!isPastMonth) {
          if (loan.type === 'lent') {
            // Es dinero que entra (Cobro de préstamo)
            ingresoPrestamoMes += cuota;
            // Opcional: Separar capital e interes si se requiere en reportes, 
            // por ahora sumamos todo a 'ingresosPrestamos'
          } else {
            // Es dinero que sale (Pago de deuda - 'borrowed')
            egresosPrestamos += cuota;
            egresosPrestamosInteres += interes;
            egresosPrestamosCapital += cuota - interes;
          }
        }

        newLoans[loan.id] = {
          saldo: prev.saldo - (cuota - interes),
          cuotasRestantes: prev.cuotasRestantes - 1
        };
      } else {
        newLoans[loan.id] = prev;
      }
    });

    // Asignar al acumulador global
    const ingresosPrestamos = ingresoPrestamoMes;

    // --- Tarjetas de crédito ---
    const newCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }> = { ...prevCardInstallments };

    transactions.filter(tx => tx.type === 'expense' && (tx.installments || 1) > 1).forEach(tx => {
      const txDate = new Date(tx.date);
      const cuotas = tx.installments || 1;

      // Calculate active range using calendar months difference
      // Installment 1 is in txDate month (month 0)
      // Installment N is in month N-1
      const diffMonths = differenceInCalendarMonths(date, txDate);

      // If we are in the transaction month or later, AND within the quota count
      if (diffMonths >= 0 && diffMonths < cuotas) {
        // This is a much safer check than day comparison
        const pm = paymentMethods.find(pm => pm.id === tx.payment_method_id);
        if (pm && pm.type === 'credit') {
          const valorCuota = tx.amount / cuotas;
          if (!isPastMonth) {
            egresosTarjeta += valorCuota;
          }
        }
      }
    });


    // --- Gastos reales del mes (Historical) ---
    // Excluir transferencias entre cuentas propias para no inflar flujo neto (mismo criterio que Dashboard)
    transactions.forEach(tx => {
      if (isTransferTransaction(tx)) return;
      const txDate = new Date(tx.date);
      const isSameMonth = tx.date && !isNaN(txDate.getTime()) && format(txDate, 'yyyy-MM') === format(date, 'yyyy-MM');
      const pm = paymentMethods.find(p => p.id === tx.payment_method_id);

      const isMultiCuotaCC = pm?.type === 'credit' && (tx.installments || 1) > 1;

      if (isSameMonth && !isMultiCuotaCC) {
        if (tx.type === 'expense') {
          egresosReales += tx.amount;
        } else if (tx.type === 'income') {
          // Allow income to be shown for ALL months (Past, Current, Future) if a transaction exists
          otrosIngresos += tx.amount;
        }
      }
    });

    // --- Ingresos Logic Simplified ---
    // (Redundant block removed)



    // Calcular totales y balances antes de usarlos
    const ingresosTotales = ingresosSalario + interesesAhorro + otrosIngresos + ingresosPrestamos;
    // Note: egresosReales contains only expenses.
    const egresosTotales = gastosFuturos + egresosPrestamos + egresosTarjeta + egresosReales;
    const balanceNetoMes = ingresosTotales - egresosTotales;
    const balanceAcumulado = prevBalance + balanceNetoMes;

    return {
      mes: format(date, 'MMMM yyyy'),
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
      egresosTarjetaInteres: round(egresosTarjetaInteres),
      egresosTarjetaCapital: round(egresosTarjetaCapital),
      egresosReales: round(egresosReales),
      balanceNetoMes: round(balanceNetoMes),
      balanceAcumulado: round(balanceAcumulado),
      newSavings,
      newLoans,
      newCardInstallments,
    };
  }

  // --- Mapear los próximos 12 meses con estado acumulado ---
  const monthlyBreakdown = useMemo(() => {
    let prevBalance = balance_actual;
    let prevSavings: Record<string, number> = {};
    let prevLoans: Record<string, { saldo: number, cuotasRestantes: number }> = {};
    let prevCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }> = {};
    const arr = [];
    for (let m = 0; m < 12; m++) {
      const d = addMonths(start, m);
      const snap = calculateMonthlySnapshot(d, prevBalance, prevSavings, prevLoans, prevCardInstallments);
      arr.push(snap);
      prevBalance = snap.balanceAcumulado;
      prevSavings = snap.newSavings;
      prevLoans = snap.newLoans;
      prevCardInstallments = snap.newCardInstallments;
    }
    return arr;
  }, [balance_actual, budgets, savingsAccounts, loans, paymentMethods, transactions, start, futureExpenses, categories]);

  // --- Serie para gráfica (compatibilidad) ---
  // --- Serie para gráfica (compatibilidad) ---
  let runningRealBalance = balance_actual;

  // Find last transaction date
  const lastTxDate = useMemo(() => {
    if (transactions.length === 0) return new Date();
    // Assuming transactions are NOT sorted effectively here, or just to be safe:
    // We need the MAX date.
    // transactions usually have string 'date'.
    return transactions.reduce((max, t) => {
      const d = new Date(t.date);
      return d > max ? d : max;
    }, new Date(0)); // Start from epoch
  }, [transactions]);

  // If no transactions found (unlikely if user is using app), default to now?
  // The reduce with epoch will return epoch if empty. 
  // If empty, let's use now.
  const pivotDate = transactions.length > 0 ? lastTxDate : new Date();

  const cashFlowSeries = monthlyBreakdown.map((row, idx) => {
    // Calculate 'Real' flow
    const realFlowNet =
      (row.ingresosTotales) -
      (row.egresosReales + row.egresosPrestamos + row.egresosTarjeta);

    // Update running balance
    runningRealBalance += realFlowNet;

    // Check dates for cutoff logic
    const rowDate = addMonths(start, idx);
    const startRow = startOfMonth(rowDate);
    const startPivot = startOfMonth(pivotDate);

    const isAfterPivot = isAfter(startRow, startPivot);
    const isBeforePivot = isBefore(startRow, startPivot);
    const isSamePivot = isSameMonth(startRow, startPivot);

    const val = (idx === 0) ? balance_actual : runningRealBalance;

    return {
      rowDate, // Keep for later processing
      name: format(addMonths(start, idx), 'MMM', { locale: es }).replace('.', ''),
      ingresos: row.ingresosTotales,
      ingresosSalario: row.ingresosSalario,
      interesesAhorro: row.interesesAhorro,
      egresos: row.egresosTotales,
      gastosFuturos: row.gastosFuturos,
      egresosPrestamos: row.egresosPrestamos,
      egresosTarjeta: row.egresosTarjeta,
      egresosReales: row.egresosReales,
      // Raw values for now, will post-process for stitching
      balanceReal_Raw: val,
      balanceProyectado_Raw: row.balanceAcumulado,
      isAfterPivot,
      isBeforePivot,
      isSamePivot,
      breakdown: row,
    };
  });

  // --- Post-Processing: Stitching & Warning Detection ---

  // 1. Detect Pending Past Expenses (Warning Condition)
  // Check if there are any futureExpenses with status='pending' and date < pivotDate
  const pendingPastExpenses = futureExpenses.filter(fe =>
    fe.status === 'pending' && !fe.is_subscription && isBefore(new Date(fe.payment_date), pivotDate)
  );

  const pendingPastExpensesTotal = pendingPastExpenses.reduce((sum, fe) => sum + fe.amount, 0);
  const hasPendingPastExpenses = pendingPastExpenses.length > 0;

  // 2. Stitch Gap & Anchor to Truth
  // Find Pivot Point (The "Present")
  const pivotPoint = cashFlowSeries.find(p => p.isSamePivot);

  // Calculate Anchoring Corrections
  // Goal: Both Real and Projected lines must pass through 'balance_actual' (The Truth) at the Pivot Point.
  // Currently, they are calculated relative to 'balance_actual' starting at Month 0 (which might be in the past).
  // So we calculate the difference between the "Calculated Value at Pivot" and the "True Value at Pivot".

  const rawRealAtPivot = pivotPoint ? pivotPoint.balanceReal_Raw : balance_actual;
  const rawProjectedAtPivot = pivotPoint ? pivotPoint.balanceProyectado_Raw : balance_actual;

  const realCorrection = balance_actual - rawRealAtPivot;
  const projectedCorrection = balance_actual - rawProjectedAtPivot;

  // 3. Finalize Series
  const finalSeries = cashFlowSeries.map(p => {
    // Apply Anchoring Corrections
    const stitchedReal = p.balanceReal_Raw + realCorrection;
    const stitchedProjected = p.balanceProyectado_Raw + projectedCorrection;

    // Simulated "Ideal" Balance: What if we had paid all those past debts?
    // We assume those debts would have been paid from the CURRENT balance.
    // So the "True" starting balance would be (balance_actual - pendingPastExpensesTotal).
    // So the curve shifts down by pendingPastExpensesTotal.
    const simulatedProjected = stitchedProjected - pendingPastExpensesTotal;

    return {
      name: p.name,
      ingresos: p.ingresos,
      ingresosSalario: p.ingresosSalario,
      interesesAhorro: p.interesesAhorro,
      egresos: p.egresos,
      gastosFuturos: p.gastosFuturos,
      egresosPrestamos: p.egresosPrestamos,
      egresosTarjeta: p.egresosTarjeta,
      egresosReales: p.egresosReales,
      breakdown: p.breakdown,

      // Cutoff Logic + Stitching
      balanceReal: p.isAfterPivot ? null : stitchedReal,

      // Projected: Show from Pivot (inclusive) with Stitched Value
      balanceProyectado: p.isBeforePivot ? null : stitchedProjected,

      // Simulated: Show from Pivot (inclusive), only if warning exists
      balanceSimulated: (hasPendingPastExpenses && !p.isBeforePivot) ? simulatedProjected : null
    };
  });

  return {
    cashFlowSeries: finalSeries,
    balance_actual,
    monthlyBreakdown,
    proyeccion_ingresos: finalSeries.length > 0 ? finalSeries[0].ingresos : 0,
    compromisos_deuda: finalSeries.length > 0 ? (finalSeries[0].egresosPrestamos + finalSeries[0].egresosTarjeta) : 0,
    isProjectionWarning: hasPendingPastExpenses,
  };
}
