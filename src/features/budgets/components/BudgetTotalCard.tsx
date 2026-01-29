import React from 'react';
import { BudgetState } from '@/hooks/useBudgetsData';
import { Target, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';


interface BudgetTotalCardProps {
  budgets: BudgetState[];
}

export function BudgetTotalCard({ budgets }: BudgetTotalCardProps) {
  // Formateador coherente con estilo JP Morgan
  const formatCurrencyPremium = (value: number) => {
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);

    return (
      <span className="font-medium tracking-tight text-foreground">
        <span className="text-[0.7em] opacity-60 mr-0.5">$</span>
        {formatted.replace('$', '').trim()}
      </span>
    );
  };

  const totalBudget = budgets.reduce((acc, b) => acc + (b.budget.amount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = totalBudget - totalSpent;
  const globalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (budgets.length === 0) {
    return (
      <div className="finance-card min-h-[420px] flex flex-col items-center justify-center border-dashed border-2">
        <p className="text-muted-foreground text-sm font-medium">No se registran presupuestos activos</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[420px] space-y-4">
      {/* SECCIÓN DE TOTALES AUMENTADA (Iguala peso visual a la segunda tarjeta) */}
      <div className="finance-card relative overflow-hidden p-6">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Presupuesto Global</p>
            <h3 className="text-3xl font-light text-foreground leading-none">
              {formatCurrencyPremium(totalBudget)}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Porcentaje de Uso</p>
            <div className={cn(
              "text-2xl font-bold",
              globalPercentage > 90 ? "text-red-500" : "text-foreground"
            )}>
              {globalPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Métricas de eficiencia adicionales */}
        <div className="flex gap-6 mb-6 py-4 border-y border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Disponible</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrencyPremium(totalRemaining)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded">
              <Target className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Categorías</p>
              <p className="text-sm font-semibold text-foreground">{budgets.length} Activas</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
            <span>Estado de Ejecución</span>
            <span>{formatCurrencyPremium(totalSpent)} gastados</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-1000", globalPercentage > 100 ? "bg-red-500" : "bg-primary")}
              style={{ width: `${Math.min(globalPercentage, 100)}%` }}
            />
          </div>
        </div>

      </div>

    </div>

  );
}