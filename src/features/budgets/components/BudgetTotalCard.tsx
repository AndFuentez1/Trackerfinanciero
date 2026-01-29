import React from 'react';
import { BudgetState } from '@/hooks/useBudgetsData';

interface BudgetTotalCardProps {
  budgets: BudgetState[];
}

// Card de ingresos expandida horizontalmente
export function BudgetTotalCard({ budgets = [] }: BudgetTotalCardProps) {
  if (budgets.length === 0) {
    return (
      <div className="finance-card min-h-[420px] flex flex-col items-center justify-center border-dashed border-2">
        <p className="text-muted-foreground text-sm font-medium">No se registran presupuestos activos</p>
      </div>
    );
  }

  // Ejemplo de card de ingresos expandida horizontalmente
  // Puedes personalizar el contenido según tu lógica de ingresos
  return (
    <div className="flex flex-col h-full min-h-[420px] w-full">
      <div className="finance-card w-full h-full flex flex-col justify-center items-center p-8">
        <h2 className="text-2xl font-bold mb-4">Ingresos</h2>
        {/* Aquí puedes agregar métricas, gráficos o detalles de ingresos */}
        <div className="flex flex-row w-full justify-center items-center gap-8">
          {/* Ejemplo de sección de ingresos */}
          <div className="flex flex-col items-center justify-center flex-1">
            <span className="text-lg font-semibold text-foreground">Total Ingresos</span>
            {/* Aquí podrías mostrar el total de ingresos si tienes esa data */}
            <span className="text-3xl font-bold text-primary">$0</span>
          </div>
          {/* Puedes agregar más secciones aquí si lo necesitas */}
        </div>
      </div>
    </div>
  );
}