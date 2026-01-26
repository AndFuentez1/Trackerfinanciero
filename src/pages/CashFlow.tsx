import React, { useState } from 'react';
import { useCashFlow } from '@/hooks/useCashFlow';
import CashFlowSkeleton from '@/components/finance/CashFlowSkeleton';
import { Sidebar } from '@/components/Sidebar';
import { CashFlowFilters } from '@/components/cashflow/CashFlowFilters';
import { CashFlowSummaryCards } from '@/components/cashflow/CashFlowSummaryCards';
import { CashFlowChart } from '@/components/cashflow/CashFlowChart';
// import { CashFlowTimeline } from '@/components/cashflow/CashFlowTimeline';

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
  const availableMonths = [1,2,3,4,5,6,7,8,9,10,11,12];

  // Datos para tarjetas
  const estimatedIncome = proyeccion_ingresos;
  const futureExpenses = 0; // Implementar si hay gastos fijos
  const debtCommitments = compromisos_deuda;
  const projectedBalance = cashFlowSeries.length > 0 ? cashFlowSeries[cashFlowSeries.length-1].balanceProyectado : 0;

  // Formateador global de moneda
  const formatCOP = (v: number | null | undefined) =>
    (typeof v === 'number' && !isNaN(v)) ? v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }) : '$ 0,00';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-row bg-background">
        <Sidebar />
        <div className="flex-1">
          <CashFlowSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-row bg-background">
      <Sidebar />
      <div className="flex-1 min-h-[60vh] flex flex-col gap-6 w-full max-w-5xl mx-auto py-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Flujo de Caja</h2>
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
      </div>
    </div>
  );
}
