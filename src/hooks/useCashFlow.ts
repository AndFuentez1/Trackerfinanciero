import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLoans } from '@/contexts/LoansContext';
import { useBudgetsData } from './useBudgetsData';
import { addMonths, startOfMonth, format } from 'date-fns';
import { CashFlowPoint } from '@/components/cashflow/cashflow.types';

export function useCashFlow(year: number, month: number | 'all', range: 'mes' | '6m' | 'año') {
  const { transactions, paymentMethods } = useFinance();
  const { loans } = useLoans();
  const { budgets } = useBudgetsData();

  // Balance actual por cuentas
  const balance_actual = useMemo(() => {
    return paymentMethods.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [paymentMethods]);

  // Proyección de ingresos (presupuestos tipo income + transacciones recurrentes)
  const proyeccion_ingresos = useMemo(() => {
    let total = 0;
    budgets.forEach(b => {
      if (b.budget && b.budget.period === 'monthly' && b.budget.amount > 0 && b.categoryName === 'Ingresos') {
        total += b.budget.amount;
      }
    });
    // Sumar transacciones recurrentes tipo income si existen (no implementado aquí)
    return total;
  }, [budgets]);

  // Compromisos de deuda (cuotas préstamos + pagos mínimos TC)
  const compromisos_deuda = useMemo(() => {
    let total = 0;
    loans.forEach(loan => {
      if (loan.due_date && loan.total_amount) {
        total += Math.round(loan.total_amount / 12); // Suponiendo cuota mensual
      }
    });
    paymentMethods.forEach(pm => {
      if (pm.type === 'credit' && pm.balance > 0 && pm.payment_day) {
        total += Math.round(pm.balance / 12); // Pago mínimo estimado
      }
    });
    return total;
  }, [loans, paymentMethods]);

  // Generar array para la gráfica
  const cashFlowSeries: CashFlowPoint[] = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(new Date(year, 0, 1));
    const points: CashFlowPoint[] = [];
    let runningReal = balance_actual;
    let runningProj = balance_actual;
    let monthsCount = range === 'mes' ? 1 : range === '6m' ? 6 : 12;
    for (let m = 0; m < monthsCount; m++) {
      const d = addMonths(start, month === 'all' ? m : month - 1);
      const fecha = format(d, 'yyyy-MM-dd');
      // Real: solo hasta hoy
      const isPast = d <= now;
      // Sumar ingresos y restar egresos/deuda
      if (isPast) {
        runningReal += proyeccion_ingresos - compromisos_deuda;
      }
      runningProj += proyeccion_ingresos - compromisos_deuda;
      points.push({
        fecha,
        real: isPast ? runningReal : null,
        proyectado: runningProj,
        income_estimate: proyeccion_ingresos,
        expense_estimate: 0, // Implementar si hay gastos fijos
        debt_commitment: compromisos_deuda,
        net_balance: runningProj,
      });
    }
    return points;
  }, [year, month, range, balance_actual, proyeccion_ingresos, compromisos_deuda]);

  return {
    cashFlowSeries,
    balance_actual,
    proyeccion_ingresos,
    compromisos_deuda,
  };
}
