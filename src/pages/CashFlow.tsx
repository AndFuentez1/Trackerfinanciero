import React, { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useCashFlow } from '@/hooks/useCashFlow';
import { SkeletonLoader } from '@/components/common/skeletons/SkeletonLoader';
import { CashFlowFilters } from '@/features/cashflow/components/CashFlowFilters';
import { CashFlowSummaryCards } from '@/features/cashflow/components/CashFlowSummaryCards';
import { CashFlowChart } from '@/features/cashflow/components/CashFlowChart';
import { CashFlowTimeline } from "@/features/cashflow/components/CashFlowTimeline";
import { Wallet, BarChart3 } from 'lucide-react';

export default function CashFlow() {
  // Filtros de año/mes/rango
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>('all');
  const [range, setRange] = useState<'mes' | '6m' | 'año'>('año');

  // Estado para fila expandida en la tabla de desglose mensual
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Datos reales del hook
  const { cashFlowSeries, balance_actual, proyeccion_ingresos, compromisos_deuda, monthlyBreakdown } = useCashFlow(year, month, range);
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
  const formatCOP = (v: number | null | undefined) =>
    (typeof v === 'number' && !isNaN(v)) ? v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }) : '$ 0,00';

  if (loading) {
    return <SkeletonLoader tab="cashflow" fullPage withLayoutWrapper />;
  }

  return (
    <div className="min-h-screen bg-background/30">
      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border-b border-border/40 pb-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-border">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Flujo de Caja</h1>
              <p className="text-muted-foreground font-medium">Proyección de ingresos y egresos</p>
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
          <CashFlowChart data={cashFlowSeries} loading={loading} />
        </div>
        {/* Tabla de Desglose Mensual */}
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Desglose Mensual</h3>
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
                          className="text-xs underline text-primary hover:text-primary-foreground focus:outline-none"
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
                            </div>
                            {/* GASTOS */}
                            <div>
                              <div className="font-semibold mb-1 text-destructive">Gastos</div>
                              <div><span className="font-semibold">Gastos Futuros:</span> {formatCOP(row.gastosFuturos)}</div>
                              <div><span className="font-semibold">Cuotas Préstamos:</span> {formatCOP(row.egresosPrestamos)} <span className="ml-2">(Capital: {formatCOP(row.egresosPrestamosCapital)}, Interés: {formatCOP(row.egresosPrestamosInteres)})</span></div>
                              <div><span className="font-semibold">Cuotas Tarjeta:</span> {formatCOP(row.egresosTarjeta)} <span className="ml-2">(Capital: {formatCOP(row.egresosTarjetaCapital)}, Interés: {formatCOP(row.egresosTarjetaInteres)})</span></div>
                              <div><span className="font-semibold">Gastos:</span> {formatCOP(row.egresosReales)}</div>
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
