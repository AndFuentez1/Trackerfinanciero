import React, { useEffect, useState } from 'react';
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useCashFlow } from '@/features/finance/cashflow/hooks/useCashFlow';
import { SkeletonLoader } from '@/shared/components/skeletons/SkeletonLoader';
import { CashFlowFilters } from '@/features/finance/cashflow/components/CashFlowFilters';
import { CashFlowSummaryCards } from '@/features/finance/cashflow/components/CashFlowSummaryCards';
import { CashFlowChart } from '@/features/finance/cashflow/components/CashFlowChart';
import { CashFlowTimeline } from "@/features/finance/cashflow/components/CashFlowTimeline";
import { Wallet, Link, Unlink } from 'lucide-react';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import { cn } from '@/core/utils';
import { useToast } from '@/shared/hooks/use-toast';
import { getBackendUrl } from '@/core/api/backend';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/api/queryKeys';
import { useUserConfigStatus } from '@/features/settings/components/hooks/useUserConfigStatus';

const CASHFLOW_REAL_BALANCE_KEY = 'cashflow-use-real-balance';
const BACKEND_URL = getBackendUrl();

export default function CashFlow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: configStatus } = useUserConfigStatus(user?.id);

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
  const { cashFlowSeries, proyeccion_ingresos, compromisos_deuda, monthlyBreakdown, isProjectionWarning } = useCashFlow(year, month, range, 'real', useRealBalance);
  const loading = !cashFlowSeries;

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

    const formatted = v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 });
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
    setUseRealBalance(value);
    setIsRealBalanceHydrated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CASHFLOW_REAL_BALANCE_KEY, String(value));
    }

    if (!user?.id) { return; }

    try {
      const body: { userId: string; cashflowUseRealBalance: boolean; email?: string } = {
        userId: user.id,
        cashflowUseRealBalance: value
      };
      if (!configStatus?.hasEmail && user.email) {
        body.email = user.email;
      }

      const response = await fetch(`${BACKEND_URL}/api/user/config/cashflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) { throw new Error('Failed to save cashflow preference'); }

      queryClient.setQueryData(queryKeys.user.config(user.id), // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (old: Record<string, any> | undefined) => {
          if (!old) { return old; }
          return { ...old, cashflowUseRealBalance: value };
        });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.config(user.id) });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la preferencia de flujo de caja',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <SkeletonLoader tab="cashflow" fullPage={false} withLayoutWrapper />;
  }

  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="border-b border-border/40 pb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border shrink-0">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">Flujo de Caja</h1>
                <p className="text-muted-foreground font-medium mt-1 leading-none text-sm">Proyección de ingresos y egresos</p>
              </div>
            </div>
          </div>
        </header>

        {/* Removed internal heading h2 since we have a header now */}
        <CashFlowFilters
          year={year}
          month={month}
          onYearChange={(y: number | 'all') => setYear(y === 'all' ? new Date().getFullYear() : y)}
          onMonthChange={(m: number | 'all') => setMonth(m)}
          availableYears={availableYears}
          availableMonths={availableMonths}
          loading={loading}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <CashFlowSummaryCards
            loading={loading}
            estimatedIncome={estimatedIncome}
            futureExpenses={futureExpenses}
            debtCommitments={debtCommitments}
            projectedBalance={projectedBalance}
          />
        </div>
        <div className="mb-6">
          <CashFlowChart data={cashFlowSeries} loading={loading} isWarning={isProjectionWarning} />
        </div>
        {/* Tabla de Desglose Mensual */}
        <div className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <h3 className="text-lg font-semibold text-foreground">Desglose Mensual</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-input bg-card">
            <table className="min-w-full text-sm">
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
                              <div><span className="font-semibold">Cuotas Préstamos:</span> {formatCOP(row.egresosPrestamos)} <span className="ml-2">(Capital: {formatCOP(row.egresosPrestamosCapital)}, Interés: {formatCOP(row.egresosPrestamosInteres)})</span></div>
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
          </div>
        </div>
      </main>
    </div>
  );
}



