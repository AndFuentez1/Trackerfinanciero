import { useMemo, useEffect } from 'react';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { useLoans } from '@/features/finance/loans/context/LoansContext';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { useFinanceQueries } from '@/features/finance/hooks/useFinanceQueries';
import { startOfMonth, format, isBefore, addMonths, isSameMonth, isAfter } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { es } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { calculateMonthlySnapshot, FutureExpense, MonthlySnapshot } from '@/features/finance/cashflow/utils/cashFlowCalculations';
import { calculateCurrentRealBalance } from '@/features/finance/utils/financeUtils';
import type { CashFlowChartPoint } from '@/features/finance/cashflow/types/cashflowTypes';
import { parseLocalDate } from '@/core/utils';

// Helper: Redondeo seguro a 2 decimales para evitar errores de punto flotante
const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

type CardInstallmentsMap = Record<string, { restantes: number; valorCuota: number; interes: number; capital: number }>;

export function useCashFlow(year: number, month: number | 'all', range: 'mes' | '6m' | 'año', incomeMode: 'real' | 'projected' = 'real', useRealBalance: boolean = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { transactions, allTransactions, paymentMethods, categories } = useFinance();
  const { loans } = useLoans();
  const { savingsAccounts } = useSavingsData();
  const { budgets: rawBudgets } = useFinanceQueries(user?.id);

  const transactionsSource = useMemo(
    () => (allTransactions && allTransactions.length > 0 ? allTransactions : transactions),
    [allTransactions, transactions]
  );

  const { data: futureExpenses = [] } = useQuery({
    queryKey: ['finance', 'futureExpenses', user?.id],
    queryFn: async () => {
      if (!user) { return []; }
      const { data, error } = await supabase
        .from('future_expenses')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'paid');
      if (error) { throw error; }
      return data as FutureExpense[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) { return; }
    const channel = supabase
      .channel('cf_future_expenses_realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'future_expenses', filter: `user_id = eq.${user.id} ` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['finance', 'futureExpenses', user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const balance_actual = useMemo(() => {
    return round(calculateCurrentRealBalance(paymentMethods));
  }, [paymentMethods]);

  const lastTxDate = useMemo(() => {
    if (transactionsSource.length === 0) { return new Date(0); }
    return transactionsSource.reduce((max, t) => {
      const d = parseLocalDate(t.date) ?? new Date(t.date);
      return d > max ? d : max;
    }, new Date(0));
  }, [transactionsSource]);

  const transactionsByMonth = useMemo(() => {
    const map = new Map<string, typeof transactionsSource>();
    transactionsSource.forEach(tx => {
      const txDate = parseLocalDate(tx.date) ?? new Date(tx.date);
      const key = format(txDate, 'yyyy-MM');
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    });
    return map;
  }, [transactionsSource]);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const start = month === 'all'
    ? startOfMonth(new Date(year, 0, 1))
    : startOfMonth(new Date(year, Number(month) - 1, 1));
  const monthsCount = range === 'mes' ? 1 : range === '6m' ? 6 : 12;

  const monthlyBreakdownRaw = useMemo(() => {
    let pb = 0;
    let ps: Record<string, number> = {};
    let pl: Record<string, { saldo: number, cuotasRestantes: number }> = {};
    let pc: CardInstallmentsMap = {};
    const arr: MonthlySnapshot[] = [];

    // Prepare context and data objects for the calculation function
    const context = {
      currentMonthStart,
      lastTxDate,
      categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
      transactionsByMonth
    };

    const data = {
      transactions: transactionsSource,
      paymentMethods,
      savingsAccounts,
      loans,
      budgets: rawBudgets,
      futureExpenses,
      categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
      incomeMode
    };

    for (let m = 0; m < monthsCount; m++) {
      const snap = calculateMonthlySnapshot(addMonths(start, m), pb, ps, pl, pc, data, context);
      arr.push(snap);
      pb = snap.balanceAcumulado;
      ps = snap.newSavings;
      pl = snap.newLoans;
      pc = snap.newCardInstallments;
    }
    return arr;
  }, [savingsAccounts, loans, paymentMethods, transactionsSource, start, futureExpenses, categories, incomeMode, lastTxDate, rawBudgets, monthsCount, currentMonthStart, transactionsByMonth]);

  const pivotDate = transactionsSource.length > 0 ? lastTxDate : new Date();

  const cashFlowSeries = monthlyBreakdownRaw.map((row, idx) => {
    const rowDate = addMonths(start, idx);
    const startRow = startOfMonth(rowDate);
    const startPivot = startOfMonth(pivotDate);
    const isAfterPivot = isAfter(startRow, startPivot);
    const isBeforePivot = isBefore(startRow, startPivot);
    const isSamePivot = isSameMonth(startRow, startPivot);

    return {
      name: format(rowDate, 'MMM', { locale: es }).replace('.', ''),
      nameMobile: format(rowDate, 'MMMMM', { locale: es }).charAt(0).toUpperCase(),
      ingresos: row.ingresosTotales,
      egresos: row.egresosTotales,
      balanceReal_Raw: row.balanceAcumulado,
      balanceProyectado_Raw: row.balanceAcumulado,
      isAfterPivot, isBeforePivot, isSamePivot,
      breakdown: row,
    };
  });

  const pivotPoint = cashFlowSeries.find(p => p.isSamePivot);
  // Find the last point BEFORE pivot (last month with complete real data)
  const lastHistoricalPoint = cashFlowSeries.slice().reverse().find(p => p.isBeforePivot);
  // Use last historical point as anchor for projection continuity
  const projectionOffset = lastHistoricalPoint ? round(balance_actual - lastHistoricalPoint.balanceProyectado_Raw) : 0;
  const balanceAdjustment = pivotPoint ? round(balance_actual - pivotPoint.balanceReal_Raw) : 0;
  const showBalanceAdjustment = useRealBalance && Math.abs(balanceAdjustment) > 0.01;
  const pendingPastExpensesTotal = futureExpenses
    .filter(fe => fe.status === 'pending' && fe.payment_date && isBefore(new Date(fe.payment_date), currentMonthStart))
    .reduce((sum, fe) => sum + fe.amount, 0);

  const finalSeries: CashFlowChartPoint[] = cashFlowSeries.map(p => {
    const projected = round(p.balanceProyectado_Raw + projectionOffset);
    return {
      ...p,
      balanceReal: p.isAfterPivot ? null : p.balanceReal_Raw,
      // Include pivot point in projection so lines connect
      balanceProyectado: p.isBeforePivot ? null : projected,
      balanceSimulated: (pendingPastExpensesTotal > 0 && !p.isBeforePivot)
        ? round(projected - pendingPastExpensesTotal)
        : null,
      balanceAjuste: p.isSamePivot && showBalanceAdjustment ? balance_actual : null,
      balanceAjusteDelta: p.isSamePivot && showBalanceAdjustment ? balanceAdjustment : null
    };
  });

  const monthlyBreakdown = useMemo(() => {
    if (projectionOffset === 0) { return monthlyBreakdownRaw; }
    return monthlyBreakdownRaw.map((row, idx) => {
      const isBeforePivot = cashFlowSeries[idx]?.isBeforePivot ?? true;
      if (isBeforePivot) { return row; }
      return {
        ...row,
        balanceAcumulado: round(row.balanceAcumulado + projectionOffset),
      };
    });
  }, [monthlyBreakdownRaw, cashFlowSeries, projectionOffset]);

  return {
    cashFlowSeries: finalSeries,
    balance_actual,
    monthlyBreakdown,
    proyeccion_ingresos: finalSeries.length > 0 ? finalSeries[0].ingresos : 0,
    compromisos_deuda: finalSeries.length > 0 ? (finalSeries[0].breakdown.egresosPrestamos + finalSeries[0].breakdown.egresosTarjeta) : 0,
    isProjectionWarning: pendingPastExpensesTotal > 0,
  };
}
