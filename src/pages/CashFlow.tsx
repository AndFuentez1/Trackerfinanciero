import React, { useState } from 'react';
import { useCashFlow } from '@/hooks/useCashFlow';
import CashFlowSkeleton from '@/components/finance/CashFlowSkeleton';
import { CashFlowFilters } from '@/components/cashflow/CashFlowFilters';
import { CashFlowSummaryCards } from '@/components/cashflow/CashFlowSummaryCards';
import { CashFlowChart } from '@/components/cashflow/CashFlowChart';
import { CashFlowTimeline } from '@/components/cashflow/CashFlowTimeline';

export default function CashFlow() {
  console.log('[Flujo de Caja] Renderizado');
  // Filtros de año/mes/rango
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>('all');
  const [range, setRange] = useState<'mes' | '6m' | 'año'>('año');

  // Datos reales del hook
  const { cashFlowSeries, balance_actual, proyeccion_ingresos, compromisos_deuda } = useCashFlow(year, month, range);
  console.log('[Flujo de Caja] Datos:', {
    year,
    month,
    range,
    balance_actual,
    proyeccion_ingresos,
    compromisos_deuda,
    cashFlowSeries,
  });
  const loading = !cashFlowSeries;

  // Años/meses disponibles (debería venir de los datos)
  const availableYears = [2024, 2025, 2026];
  const availableMonths = [1,2,3,4,5,6,7,8,9,10,11,12];

  // Datos para tarjetas
  const estimatedIncome = proyeccion_ingresos;
  const futureExpenses = 0; // Implementar si hay gastos fijos
  const debtCommitments = compromisos_deuda;
  const projectedBalance = cashFlowSeries.length > 0 ? cashFlowSeries[cashFlowSeries.length-1].net_balance : 0;

  // Timeline: eventos de deuda y pagos futuros
  const timelineEvents = cashFlowSeries.map((point, idx) => ({
    id: String(idx),
    name: point.real !== null ? 'Balance Real' : 'Balance Proyectado',
    date: point.fecha,
    amount: point.net_balance,
    type: point.real !== null ? 'real' : 'proyectado',
  }));

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="p-8 rounded-xl bg-muted/40 border border-muted shadow-md flex flex-col items-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mb-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <h2 className="text-2xl font-bold text-foreground mb-2">Flujo de Caja</h2>
        <p className="text-muted-foreground text-center max-w-md">Esta sección está en construcción.<br />Pronto podrás visualizar y proyectar tu flujo de caja anual con un diseño profesional y minimalista.</p>
      </div>
    </div>
  );
}
