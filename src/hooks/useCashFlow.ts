
import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLoans } from '@/contexts/LoansContext';
import { useBudgetsData } from './useBudgetsData';
import { useSavingsData } from './useSavingsData';
import { addMonths, startOfMonth, format, isBefore, isAfter, isSameMonth, parseISO } from 'date-fns';

// Helper: calcular cuota mensual de préstamo (sistema francés)
function calcularCuotaFrancesa(principal: number, tasaAnual: number, nMeses: number) {
  if (tasaAnual === 0) return principal / nMeses;
  const tasaMensual = tasaAnual / 12;
  return principal * (tasaMensual * Math.pow(1 + tasaMensual, nMeses)) / (Math.pow(1 + tasaMensual, nMeses) - 1);
}

export function useCashFlow(year: number, month: number | 'all', range: 'mes' | '6m' | 'año') {

  const { transactions, paymentMethods, categories, futureExpenses } = useFinance();
  const { loans } = useLoans();
  const { budgets } = useBudgetsData();
  const { savingsAccounts } = useSavingsData();

  // Balance actual por cuentas
  const balance_actual = useMemo(() => {
    return paymentMethods.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [paymentMethods]);

  // Fechas de proyección
  const start = startOfMonth(new Date(year, 0, 1));

  // --- Cálculo detallado mensual avanzado ---
  function calculateMonthlySnapshot(date: Date, prevBalance: number, prevSavings: Record<string, number>, prevLoans: Record<string, { saldo: number, cuotasRestantes: number }>, prevCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }>) {
    // Ingresos
    let ingresosSalario = 0;
    let interesesAhorro = 0;
    const otrosIngresos = 0; // Se puede extender futura implementación
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
        interes = prev * (Math.pow(1 + acc.estimated_yield, 1 / 12) - 1);
        interesesAhorro += interes;
        newSavings[acc.id] = prev + interes;
      } else {
        newSavings[acc.id] = prev;
      }
    });

    // --- Ingresos por presupuesto (FIXED) ---
    budgets.forEach(b => {
      const cat = categories.find(c => c.id === b.budget.category_id);

      // FIX 1: Robust Income Categorization
      // Check both database type AND name conventions for fallback
      const type = cat?.type?.toLowerCase();
      const name = cat?.name?.toLowerCase() || '';
      const budgetCategoryName = b.categoryName?.toLowerCase() || '';

      const isIncome = type === 'income' ||
        name.includes('ingres') ||
        name.includes('salar') ||
        budgetCategoryName.includes('ingres') ||
        budgetCategoryName.includes('salar');

      if (isIncome && b.budget.amount > 0) {
        // FIX 2: Persistence for Monthly Budgets
        // If monthly, it applies to ALL months. If it has a specific month set (rare for recurring), check date.
        if (b.budget.period === 'monthly') {
          if (b.budget.month) {
            // Specific month budget
            if (isSameMonth(parseISO(b.budget.month), date)) {
              ingresosSalario += b.budget.amount;
            }
          } else {
            // Recurring monthly budget (applies always)
            ingresosSalario += b.budget.amount;
          }
        }
      }
    });

    // --- Gastos presupuestados y Double Counting Logic (FIXED) ---
    budgets.forEach(b => {
      const cat = categories.find(c => c.id === b.budget.category_id);

      // Determine if it's an expense
      const type = cat?.type?.toLowerCase();
      const isExpense = (type === 'expense' || !type) && b.categoryName !== 'Ingresos'; // Default unsafe to expense

      if (b.budget.period === 'monthly' && b.budget.amount > 0 && isExpense) {
        const budgetDate = b.budget.month ? parseISO(b.budget.month) : null;

        // Check if this budget applies to the current loop date
        const appliesToThisMonth = budgetDate ? isSameMonth(budgetDate, date) : true;

        if (appliesToThisMonth) {
          // FIX 3: Double Counting Prevention (Real Transactions vs Budget)
          // Si estamos en el mes actual (o pasado), 'Transactions' ya tiene los gastos reales.
          // Si ya gasté $300 de un presupuesto $500, solo proyecto $200 restantes.
          // Si ya gasté $600 de un presupuesto $500, proyecto $0 adicionales (ya se sumó en reales).

          let spentThisMonth = 0;

          // Verificamos si hay transacciones reales para esta categoría en este mes del loop
          // NOTA: Esto solo funciona si 'transactions' tiene datos del mes que estamos proyectando (usualmente Mes Actual).
          // Para meses futuros, spentThisMonth será 0.
          transactions.forEach(tx => {
            if (tx.category_id === b.budget.category_id &&
              isSameMonth(new Date(tx.date), date) &&
              tx.type === 'expense') {
              const isInstallment = (tx as any).installments && (tx as any).installments > 1;
              // No contamos cuotas de tarjeta aquí para evitar conflictos con el motor de amortización
              if (!isInstallment) {
                spentThisMonth += tx.amount;
              }
            }
          });

          // Solo sumamos el remanente positivo
          const remainingBudget = Math.max(0, b.budget.amount - spentThisMonth);
          gastosFuturos += remainingBudget;
        }
      }
    });

    // --- Gastos Futuros y Suscripciones (FIXED) ---
    futureExpenses.forEach(fe => {
      if (fe.is_subscription) {
        // Suscripción recurrente (FIX 4: Infinite Projection)
        const startDate = fe.start_date ? parseISO(fe.start_date) : null;
        const endDate = fe.end_date ? parseISO(fe.end_date) : null;

        if (startDate && isBefore(date, startDate)) return; // Aún no empieza
        if (endDate && isAfter(date, endDate)) return; // Ya terminó

        // Calcular coincidencia de frecuencia
        if (startDate) {
          // Diferencia en meses desde inicio
          const monthsSinceStart = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());

          let shouldApply = false;
          // El usuario paga en fechas específicas relative al start date
          // Simplificación: si start es Enero, monthly aplica Ene, Feb...
          // bimonthly aplica Ene (0), Mar (2)...
          if (monthsSinceStart >= 0) {
            switch (fe.frequency) {
              case 'monthly': shouldApply = true; break;
              case 'bimonthly': shouldApply = monthsSinceStart % 2 === 0; break;
              case 'quarterly': shouldApply = monthsSinceStart % 3 === 0; break;
              case 'semiannual': shouldApply = monthsSinceStart % 6 === 0; break;
              case 'yearly': shouldApply = monthsSinceStart % 12 === 0; break;
              default: shouldApply = true;
            }
          }

          if (shouldApply) {
            gastosFuturos += fe.amount;
          }
        }
      } else {
        // Gasto Puntual (FIX 5: Distinct Month Check)
        const paymentDate = parseISO(fe.payment_date);
        // Solo sumar si es EXACTAMENTE el mes del loop
        if (isSameMonth(paymentDate, date)) {
          gastosFuturos += fe.amount;
        }
      }
    });

    // --- Préstamos: amortización francesa real ---
    const newLoans: Record<string, { saldo: number, cuotasRestantes: number }> = { ...prevLoans };
    loans.forEach(loan => {
      const prev = prevLoans[loan.id] ?? { saldo: loan.total_amount - (loan.paid_amount || 0), cuotasRestantes: loan.installments || 12 };

      // Si el prestamo ya fue desembolsado y aun se debe
      if (prev.saldo > 100 && prev.cuotasRestantes > 0) { // Tolerancia de 100 pesos
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

    // --- Tarjetas de crédito: Motor de Amortización (FIXED) ---
    const newCardInstallments: Record<string, { restantes: number, valorCuota: number, interes: number, capital: number }> = { ...prevCardInstallments };

    // 1. Detectar nuevas compras a cuotas activas este mes
    transactions
      .filter(tx => tx.type === 'expense' && (tx as any).installments && (tx as any).installments > 1)
      .forEach(tx => {
        const key = tx.id;
        // Si ya existe en el estado acumulado, sigue su curso.
        // Si NO existe, verificamos "temporalmente" si debería existir hoy.
        // Esto es importante para el primer mes de la proyección (mes actual),
        // donde el "prevCardInstallments" viene vacío.
        if (!newCardInstallments[key]) {
          const txDate = new Date(tx.date);
          const totalInstallments = (tx as any).installments;

          // Meses que han pasado desde la compra hasta la fecha actual del loop 'date'
          const monthsSincePurchase = (date.getFullYear() - txDate.getFullYear()) * 12 + (date.getMonth() - txDate.getMonth());

          // Si la compra fue en el pasado (months >= 0) Y aún quedan cuotas
          if (monthsSincePurchase >= 0 && monthsSincePurchase < totalInstallments) {
            const pm = paymentMethods.find(pm => pm.id === tx.payment_method_id);
            // Si la tarjeta tiene tasa, calculamos. (Simplificado flat rate para MVP)
            const tasa = pm && pm.type === 'credit' && pm.estimated_yield ? pm.estimated_yield : 0;

            // Calcular cuántas quedan matemáticamente
            const remaining = totalInstallments - monthsSincePurchase;

            newCardInstallments[key] = {
              restantes: remaining,
              valorCuota: tx.amount / totalInstallments,
              interes: 0, // Simplificación para MVP: cuota fija sin interés complejo aquí, o usar lógica similar a préstamos
              capital: tx.amount / totalInstallments
            };
          }
        }
      });

    // 2. Procesar pagos y decrementar saldo
    Object.keys(newCardInstallments).forEach(key => {
      const item = newCardInstallments[key];
      if (item.restantes > 0) {
        egresosTarjeta += item.valorCuota;
        egresosTarjetaInteres += item.interes;
        egresosTarjetaCapital += item.capital;

        // FIX 6: Decrement Logic
        // Modificamos el objeto 'item' directamente en el record para que pase al siguiente mes
        // Pero... CUIDADO: Javascript objects are references. 
        // En la línea 226 hicimos spread {...prev}, so newCardInstallments es shallow copy.
        // Pero los items internos SI son nuevos objetos creados en el paso 1 o copiados.
        // Necesitamos asegurar que no mutamos el 'prev' state accidentalmente si referenciaba el mismo objeto.
        // Como en el paso 1 creamos nuevos objetos literal {}, estamos seguros.
        // Si vino del spread, referencia al anterior. 

        newCardInstallments[key] = {
          ...item,
          restantes: item.restantes - 1
        };
      } else {
        // Ya no se cobra
        delete newCardInstallments[key];
      }
    });


    // --- Gastos reales del mes (Transactions) ---
    // Solo sumamos los reales si ESTÁN en este mes
    transactions.forEach(tx => {
      if (tx.type === 'expense' && isSameMonth(new Date(tx.date), date)) {
        // Las cuotas NO se suman aquí porque ya se manejan en el motor de arriba o en el futuro
        // EXCEPCION: La primera cuota de una compra hecha HOY, ¿se paga hoy?
        // Generalmente las TC se pagan al mes siguiente.
        // AQUI asumimos "Cash Flow" = salida de dinero.
        // Si pagó con TC, la salida de dinero es CUANDO PAGA LA TARJETA.
        // Por tanto, las compras con TC NO son egresosReales de efectivo HOY.
        // EgresosReales = efectivo, debito, transferencia.

        const pm = paymentMethods.find(pm => pm.id === tx.payment_method_id);
        const isCredit = pm?.type === 'credit';

        if (!isCredit) {
          egresosReales += tx.amount;
        } else {
          // Si es crédito, NO es salida de efectivo hoy. Es deuda.
          // Se pagará cuando el motor de tarjetas diga (prox mes o cuotas).
        }
      }
    });

    // Totales
    const ingresosTotales = ingresosSalario + interesesAhorro + otrosIngresos;
    const egresosTotales = gastosFuturos + egresosPrestamos + egresosTarjeta + egresosReales;
    const balanceNetoMes = ingresosTotales - egresosTotales;
    const balanceAcumulado = prevBalance + balanceNetoMes;

    return {
      mes: format(date, 'MMMM yyyy'),
      ingresosTotales,
      ingresosSalario,
      interesesAhorro,
      egresosTotales,
      gastosFuturos,
      egresosPrestamos,
      egresosTarjeta,
      egresosReales,
      balanceNetoMes,
      balanceAcumulado,
      newSavings,
      newLoans,
      newCardInstallments,
    };
  }

  // --- Mapear los próximos 12 meses ---
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

  // --- Serie compatible para gráficas ---
  const cashFlowSeries = monthlyBreakdown.map((row, idx) => ({
    name: row.mes,
    ingresos: row.ingresosTotales,
    egresos: row.egresosTotales,
    balanceReal: idx === 0 ? balance_actual : null,
    balanceProyectado: row.balanceAcumulado,
    breakdown: row
  }));

  return {
    cashFlowSeries,
    balance_actual,
    monthlyBreakdown,
    proyeccion_ingresos: cashFlowSeries.length > 0 ? cashFlowSeries[0].ingresos : 0,
    compromisos_deuda: cashFlowSeries.length > 0 ? (monthlyBreakdown[0].egresosPrestamos + monthlyBreakdown[0].egresosTarjeta) : 0,
  };
}
