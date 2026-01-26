
import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLoans } from '@/contexts/LoansContext';
import { useBudgetsData } from './useBudgetsData';
import { useSavingsData } from './useSavingsData';
import { addMonths, startOfMonth, format, isBefore, isAfter, endOfMonth } from 'date-fns';
import { CashFlowPoint } from '@/components/cashflow/cashflow.types';

// Helper: calcular cuota mensual de préstamo (sistema francés)
function calcularCuotaFrancesa(principal: number, tasaAnual: number, nMeses: number) {
  if (tasaAnual === 0) return principal / nMeses;
  const tasaMensual = tasaAnual / 12;
  return principal * (tasaMensual * Math.pow(1 + tasaMensual, nMeses)) / (Math.pow(1 + tasaMensual, nMeses) - 1);
}

export function useCashFlow(year: number, month: number | 'all', range: 'mes' | '6m' | 'año') {
  const { transactions, paymentMethods } = useFinance();
  const { loans } = useLoans();
  const { budgets } = useBudgetsData();
  const { savingsAccounts } = useSavingsData();

  // Balance actual por cuentas
  const balance_actual = useMemo(() => {
    return paymentMethods.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [paymentMethods]);

  // Fechas de proyección
  const now = new Date();
  const start = startOfMonth(new Date(year, 0, 1));
  const monthsCount = range === 'mes' ? 1 : range === '6m' ? 6 : 12;
  const monthStart = month === 'all' ? 0 : (Number(month) - 1);

  // --- Cálculo detallado mensual avanzado ---
  function calculateMonthlySnapshot(date: Date, prevBalance: number, prevSavings: Record<string, number>, prevLoans: Record<string, {saldo: number, cuotasRestantes: number}>, prevCardInstallments: Record<string, {restantes: number, valorCuota: number, interes: number, capital: number}>) {
    // Ingresos
    let ingresosSalario = 0;
    let interesesAhorro = 0;
    let otrosIngresos = 0;
    // Egresos
    let gastosFuturos = 0;
    let egresosPrestamos = 0;
    let egresosPrestamosInteres = 0;
    let egresosPrestamosCapital = 0;
    let egresosTarjeta = 0;
    let egresosTarjetaInteres = 0;
    let egresosTarjetaCapital = 0;
    let egresosReales = 0;

    // --- Saldo de ahorros e intereses compuestos ---
    const newSavings: Record<string, number> = { ...prevSavings };
    savingsAccounts.forEach(acc => {
      const prev = prevSavings[acc.id] ?? acc.balance;
      let interes = 0;
      if (acc.estimated_yield && acc.estimated_yield > 0) {
        interes = prev * (Math.pow(1 + acc.estimated_yield, 1/12) - 1);
        interesesAhorro += interes;
        newSavings[acc.id] = prev + interes;
      } else {
        newSavings[acc.id] = prev;
      }
    });

    // --- Ingresos por salario (budgets tipo ingreso) ---
    budgets.forEach(b => {
      if (b.budget && b.budget.period === 'monthly' && b.budget.amount > 0 && b.categoryName === 'Ingresos') {
        ingresosSalario += b.budget.amount;
      }
    });

    // --- Gastos presupuestados no ejecutados ---
    budgets.forEach(b => {
      if (b.budget && b.budget.period === 'monthly' && b.budget.amount > 0 && b.categoryName !== 'Ingresos') {
        const yaGastado = transactions.some(tx => tx.category_id === b.budget.category_id && format(new Date(tx.date), 'yyyy-MM') === format(date, 'yyyy-MM'));
        if (!yaGastado) gastosFuturos += b.budget.amount;
      }
    });

    // --- Préstamos: amortización francesa real, separación capital/interés ---
    const newLoans: Record<string, {saldo: number, cuotasRestantes: number}> = { ...prevLoans };
    loans.forEach(loan => {
      const prev = prevLoans[loan.id] ?? { saldo: loan.total_amount - (loan.paid_amount || 0), cuotasRestantes: loan.installments || 12 };
      if (prev.saldo > 0 && prev.cuotasRestantes > 0) {
        const tasa = loan.interest_rate;
        const cuota = calcularCuotaFrancesa(prev.saldo, tasa, prev.cuotasRestantes);
        const interes = prev.saldo * tasa / 12;
        egresosPrestamos += cuota;
        egresosPrestamosInteres += interes;
        egresosPrestamosCapital += cuota - interes;
        newLoans[loan.id] = {
          saldo: prev.saldo - (cuota - interes),
          cuotasRestantes: prev.cuotasRestantes - 1
        };
      } else {
        newLoans[loan.id] = prev;
      }
    });

    // --- Tarjetas de crédito: proyección de cuotas futuras ---
    const newCardInstallments: Record<string, {restantes: number, valorCuota: number, interes: number, capital: number}> = { ...prevCardInstallments };
    transactions.filter(tx => tx.type === 'expense' && (tx as any).installments && (tx as any).installments > 1).forEach(tx => {
      const key = tx.id;
      const cuotas = (tx as any).installments;
      const pagadas = (tx as any).current_installment || 0;
      const pm = paymentMethods.find(pm => pm.id === tx.payment_method_id);
      const tasa = pm && pm.type === 'credit' && pm.estimated_yield ? pm.estimated_yield : 0;
      if (!newCardInstallments[key]) {
        newCardInstallments[key] = {
          restantes: cuotas - pagadas,
          valorCuota: tx.amount / cuotas,
          interes: tasa > 0 ? (tx.amount / cuotas) * tasa / 12 : 0,
          capital: tasa > 0 ? (tx.amount / cuotas) - ((tx.amount / cuotas) * tasa / 12) : (tx.amount / cuotas)
        };
      }
      if (newCardInstallments[key].restantes > 0) {
        egresosTarjeta += newCardInstallments[key].valorCuota;
        egresosTarjetaInteres += newCardInstallments[key].interes;
        egresosTarjetaCapital += newCardInstallments[key].capital;
        newCardInstallments[key].restantes -= 1;
      }
    });

    // --- Gastos reales del mes ---
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const isSameMonth = month === 'all' ? true : (tx.date && !isNaN(txDate.getTime()) && format(txDate, 'yyyy-MM') === format(date, 'yyyy-MM'));
      if (
        tx.type === 'expense' &&
        isSameMonth
      ) {
        egresosReales += tx.amount;
      }
    });

    // --- Préstamos que me deben (ingresos por cobrar) ---
    let ingresosPrestamos = 0;
    // Aquí podrías sumar préstamos a favor del usuario (por implementar si hay estructura)

    // Calcular totales y balances antes de usarlos
    const ingresosTotales = ingresosSalario + interesesAhorro + otrosIngresos;
    const egresosTotales = gastosFuturos + egresosPrestamos + egresosTarjeta + egresosReales;
    const balanceNetoMes = ingresosTotales - egresosTotales;
    const balanceAcumulado = prevBalance + balanceNetoMes;

    return {
      mes: format(date, 'MMMM yyyy'),
      ingresosTotales,
      ingresosSalario,
      interesesAhorro,
      ingresosPrestamos,
      otrosIngresos,
      egresosTotales,
      gastosFuturos,
      egresosPrestamos,
      egresosPrestamosInteres,
      egresosPrestamosCapital,
      egresosTarjeta,
      egresosTarjetaInteres,
      egresosTarjetaCapital,
      egresosReales,
      balanceNetoMes,
      balanceAcumulado,
      newSavings,
      newLoans,
      newCardInstallments,
    };
  }

  // --- Mapear los próximos 12 meses con estado acumulado ---
  const monthlyBreakdown = useMemo(() => {
    let prevBalance = balance_actual;
    let prevSavings: Record<string, number> = {};
    let prevLoans: Record<string, {saldo: number, cuotasRestantes: number}> = {};
    let prevCardInstallments: Record<string, {restantes: number, valorCuota: number, interes: number, capital: number}> = {};
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
  }, [balance_actual, budgets, savingsAccounts, loans, paymentMethods, transactions, start]);

  // --- Serie para gráfica (compatibilidad) ---
  const cashFlowSeries = monthlyBreakdown.map((row, idx) => ({
    name: row.mes,
    ingresos: row.ingresosTotales,
    ingresosSalario: row.ingresosSalario,
    interesesAhorro: row.interesesAhorro,
    egresos: row.egresosTotales,
    gastosFuturos: row.gastosFuturos,
    egresosPrestamos: row.egresosPrestamos,
    egresosTarjeta: row.egresosTarjeta,
    egresosReales: row.egresosReales,
    balanceReal: idx === 0 ? balance_actual : null,
    balanceProyectado: row.balanceAcumulado,
    breakdown: row,
  }));

  return {
    cashFlowSeries,
    balance_actual,
    monthlyBreakdown,
    proyeccion_ingresos: cashFlowSeries.length > 0 ? cashFlowSeries[0].ingresos : 0,
    compromisos_deuda: cashFlowSeries.length > 0 ? (cashFlowSeries[0].egresosPrestamos + cashFlowSeries[0].egresosTarjeta) : 0,
  };
}
