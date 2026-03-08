import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useSEO } from '@/shared/hooks/useSEO';
import { useCashFlow } from '@/features/finance/cashflow/hooks/useCashFlow';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useLoans } from '@/features/finance/loans/hooks/useLoans';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { CashFlowFilters } from '@/features/finance/cashflow/components/CashFlowFilters';
import { CashFlowSummaryCards } from '@/features/finance/cashflow/components/CashFlowSummaryCards';
import { CashFlowChart } from '@/features/finance/cashflow/components/CashFlowChart';
import { CashFlowTimeline } from "@/features/finance/cashflow/components/CashFlowTimeline";
import { ArrowUpRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import { useUserConfigStatus } from '@/features/settings/components/hooks/useUserConfigStatus';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/core/utils';
import { DEFAULT_LOCALE, DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';
import { usePageBootLoading } from '@/shared/layouts/PageBootContext';

const CASHFLOW_REAL_BALANCE_KEY = 'cashflow-use-real-balance';

export default function CashFlow() {
  useSEO({
    title: 'Flujo',
    description: 'Cash Flow Projection - Visualize your future income and commitments.'
  });
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: configStatus } = useUserConfigStatus(user?.id);
  const { bootLoading: financeBootLoading } = useFinanceData();
  const { bootLoading: loansBootLoading } = useLoans();
  const { bootLoading: savingsBootLoading } = useSavingsData();

  // Filtros de año/mes/rango
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>('all');
  const [range, setRange] = useState<'mes' | '6m' | 'año'>('año');

  // Estado para fila expandida en la tabla de desglose mensual
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Estado para sincronizar con saldo real
  const [useRealBalance, setUseRealBalance] = useState<boolean>(() => {
    if (typeof window === 'undefined') { return false; }
    const stored = localStorage.getItem(CASHFLOW_REAL_BALANCE_KEY);
    return stored === 'true';
  });
  const [isRealBalanceHydrated, setIsRealBalanceHydrated] = useState(() => {
    if (typeof window === 'undefined') { return false; }
    return localStorage.getItem(CASHFLOW_REAL_BALANCE_KEY) !== null;
  });

  // Datos reales del hook
  const { cashFlowSeries, proyeccion_ingresos, compromisos_deuda, monthlyBreakdown, isProjectionWarning, balance_actual } = useCashFlow(year, month, range, 'real', useRealBalance);
  const loading = authLoading || financeBootLoading || loansBootLoading || savingsBootLoading || !cashFlowSeries;
  usePageBootLoading(loading);

  // Años/meses disponibles (debería venir de los datos)
  const availableYears = [2024, 2025, 2026];
  const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Datos para tarjetas
  const estimatedIncome = proyeccion_ingresos;
  const futureExpenses = 0; // Implementar si hay gastos fijos
  const debtCommitments = compromisos_deuda;
  const projectedBalance = (cashFlowSeries && cashFlowSeries.length > 0) ? cashFlowSeries[cashFlowSeries.length - 1].balanceProyectado : 0;

  // Formateador global de moneda
  const formatCOP = (v: number | null | undefined) => {
    if (typeof v !== 'number' || isNaN(v)) { return <span className="text-muted-foreground">$ 0,00</span>; }

    const formatted = v.toLocaleString(DEFAULT_LOCALE, { style: 'currency', currency: DEFAULT_CURRENCY_CODE, minimumFractionDigits: 2 });
    const parts = formatted.split(',');

    if (parts.length === 1) { return <span>{formatted}</span>; }

    return (
      <span className="inline-flex items-baseline">
        <span>{parts[0]}</span>
        <span className="text-[0.85em] opacity-85">,{parts[1]}</span>
      </span>
    );
  };

  useEffect(() => {
    if (isRealBalanceHydrated) { return; }
    if (configStatus?.cashflowUseRealBalance === undefined) { return; }
    const serverValue = !!configStatus.cashflowUseRealBalance;
    setUseRealBalance(serverValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CASHFLOW_REAL_BALANCE_KEY, String(serverValue));
    }
    setIsRealBalanceHydrated(true);
  }, [configStatus?.cashflowUseRealBalance, isRealBalanceHydrated]);

  const handleRealBalanceChange = async (value: boolean) => {
    // 1. Update local state immediately — UI responds instantly
    setUseRealBalance(value);
    setIsRealBalanceHydrated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CASHFLOW_REAL_BALANCE_KEY, String(value));
    }

    if (!user?.id) { return; }

    try {
      // 2. Persist directly to Supabase (user_config table)
      const { error } = await supabase
        .from('user_config')
        .update({ cashflow_use_real_balance: value })
        .eq('user_id', user.id);

      if (error) { throw error; }

      // 3. Keep query cache in sync
      queryClient.setQueryData(
        queryKeys.user.config(user.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: Record<string, any> | undefined) => {
          if (!old) { return old; }
          return { ...old, cashflowUseRealBalance: value };
        }
      );
    } catch (err) {
      // Preference already saved to localStorage — silent console warning is enough
      console.warn('[CashFlow] Could not persist cashflowUseRealBalance to Supabase:', err);
    }
  };


  if (!user && !loading) { return null; }

  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {loading ? (
          <SkeletonLoader tab="cashflow" withLayoutWrapper fullPage={false} />
        ) : (
          <>
            <header className="border-b border-border pb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Flujo de Caja</h1>
                    <p className="text-muted-foreground font-medium mt-[-6px] leading-none text-sm">Visualiza tus ingresos futuros y compromisos</p>
                  </div>
                </div>
              </div>
            </header>

            <CashFlowFilters
              year={year}
              month={month}
              onYearChange={(y: number | 'all') => setYear(y === 'all' ? new Date().getFullYear() : y)}
              onMonthChange={(m: number | 'all') => setMonth(m)}
              availableYears={availableYears}
              availableMonths={availableMonths}
              loading={loading}
              useRealBalance={useRealBalance}
              onRealBalanceChange={handleRealBalanceChange}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <CashFlowSummaryCards
                loading={loading}
                estimatedIncome={estimatedIncome}
                futureExpenses={futureExpenses}
                debtCommitments={debtCommitments}
                projectedBalance={projectedBalance}
              />
            </div>

            <CashFlowChart
              data={useMemo(() => cashFlowSeries.map(s => ({ ...s, egresos: -s.egresos })), [cashFlowSeries])}
              loading={loading}
              isWarning={isProjectionWarning}
            />
            {/* Tabla de Desglose Mensual */}
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <h3 className="text-lg font-semibold text-foreground">Desglose Mensual</h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/40 border border-border/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide">Patrimonio actual:</span>
                  <span className={cn(
                    "font-semibold",
                    balance_actual >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {formatCOP(balance_actual)}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-input bg-card">
                <table className="hidden md:table min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left">Mes/Año</th>
                      <th className="px-3 py-2 text-right text-success">Ingresos Totales</th>
                      <th className="px-3 py-2 text-right text-destructive">Gastos & Deudas</th>
                      <th className="px-3 py-2 text-right">Balance Neto</th>
                      <th className="px-3 py-2 text-right">Balance Acumulado</th>
                      <th className="px-3 py-2 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBreakdown.map((row, i) => (
                      <React.Fragment key={i}>
                        <tr className="border-b last:border-0 hover:bg-muted/20 group">
                          <td className="px-3 py-2 font-medium">{row.mes}</td>
                          <td className="px-3 py-2 text-right text-success">{formatCOP(row.ingresosTotales)}</td>
                          <td className="px-3 py-2 text-right text-destructive">{formatCOP(row.egresosTotales)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCOP(row.balanceNetoMes)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCOP(row.balanceAcumulado)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              className="text-sm underline text-primary hover:text-primary/70 focus:outline-none transition-colors duration-200"
                              onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                            >
                              {expandedRow === i ? 'Ocultar' : 'Ver detalle'}
                            </button>
                          </td>
                        </tr>
                        {expandedRow === i && (
                          <tr>
                            <td colSpan={6} className="bg-muted/20 px-4 py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {/* INGRESOS */}
                                <div>
                                  <div className="font-semibold mb-1 text-success">Ingresos</div>
                                  <div><span className="font-semibold">Salario:</span> {formatCOP(row.ingresosSalario)}</div>
                                  <div><span className="font-semibold">Intereses Ahorro:</span> {formatCOP(row.interesesAhorro)}</div>
                                  <div><span className="font-semibold">Préstamos que me deben:</span> {formatCOP(row.ingresosPrestamos)}</div>
                                  <div><span className="font-semibold">Otros Ingresos:</span> {formatCOP(row.otrosIngresos)}</div>
                                </div>
                                {/* GASTOS */}
                                <div>
                                  <div className="font-semibold mb-1 text-destructive">Gastos</div>
                                  <div><span className="font-semibold">Gastos Futuros:</span> {formatCOP(row.gastosFuturos)}</div>
                                  <div><span className="font-semibold">Cuotas Préstamos:</span> {formatCOP(row.egresosPrestamos)} <span className="ml-2">(Cap: {formatCOP(row.egresosPrestamosCapital)}, Int: {formatCOP(row.egresosPrestamosInteres)})</span></div>
                                  <div><span className="font-semibold">Cuotas Tarjeta:</span> {formatCOP(row.egresosTarjeta)}</div>
                                  <div><span className="font-semibold">Gastos:</span> {formatCOP(row.egresosReales)}</div>
                                  <div><span className="font-semibold">Ahorros e Inv.:</span> {formatCOP(row.egresosAhorro)}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards for Breakdown */}
                <div className="md:hidden flex flex-col divide-y divide-border">
                  {monthlyBreakdown.map((row, i) => (
                    <div key={i} className="flex flex-col p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base">{row.mes}</span>
                        <button
                          type="button"
                          className="text-xs font-medium underline text-primary hover:text-primary/70 focus:outline-none transition-colors duration-200"
                          onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                        >
                          {expandedRow === i ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs">Ingresos</span>
                          <span className="text-success font-medium">{formatCOP(row.ingresosTotales)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground text-xs">Egresos</span>
                          <span className="text-destructive font-medium">{formatCOP(row.egresosTotales)}</span>
                        </div>
                        <div className="flex flex-col pt-1">
                          <span className="text-muted-foreground text-xs">Neto</span>
                          <span className="font-semibold">{formatCOP(row.balanceNetoMes)}</span>
                        </div>
                        <div className="flex flex-col items-end pt-1">
                          <span className="text-muted-foreground text-xs">Acumulado</span>
                          <span className="font-semibold text-primary">{formatCOP(row.balanceAcumulado)}</span>
                        </div>
                      </div>

                      {expandedRow === i && (
                        <div className="pt-3 mt-2 border-t border-border/50 grid grid-cols-1 gap-4 text-xs bg-muted/20 p-3 rounded-lg">
                          <div className="space-y-1">
                            <div className="font-semibold text-success border-b border-success/20 pb-1 mb-2">Ingresos Detalle</div>
                            <div className="flex justify-between"><span>Salario:</span> <span className="font-medium">{formatCOP(row.ingresosSalario)}</span></div>
                            <div className="flex justify-between"><span>Intereses:</span> <span className="font-medium">{formatCOP(row.interesesAhorro)}</span></div>
                            <div className="flex justify-between"><span>Préstamos a favor:</span> <span className="font-medium">{formatCOP(row.ingresosPrestamos)}</span></div>
                            <div className="flex justify-between"><span>Otros:</span> <span className="font-medium">{formatCOP(row.otrosIngresos)}</span></div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold text-destructive border-b border-destructive/20 pb-1 mb-2">Gastos Detalle</div>
                            <div className="flex justify-between"><span>Gastos Futuros:</span> <span className="font-medium">{formatCOP(row.gastosFuturos)}</span></div>
                            <div className="flex flex-col">
                              <div className="flex justify-between"><span>Cuotas Préstamos:</span> <span className="font-medium">{formatCOP(row.egresosPrestamos)}</span></div>
                              <div className="text-[10px] text-muted-foreground flex justify-between pl-2">
                                <span>Cap: {formatCOP(row.egresosPrestamosCapital)}</span>
                                <span>Int: {formatCOP(row.egresosPrestamosInteres)}</span>
                              </div>
                            </div>
                            <div className="flex justify-between"><span>Cuotas Tarjeta:</span> <span className="font-medium">{formatCOP(row.egresosTarjeta)}</span></div>
                            <div className="flex justify-between"><span>Gastos Reales:</span> <span className="font-medium">{formatCOP(row.egresosReales)}</span></div>
                            <div className="flex justify-between"><span>Ahorros e Inv.:</span> <span className="font-medium">{formatCOP(row.egresosAhorro)}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
