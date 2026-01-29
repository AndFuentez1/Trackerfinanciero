import React, { useState } from 'react';
import { CategoryItem } from '@/hooks/useFinanceData';
import { BudgetState } from '@/hooks/useBudgetsData';
import { Pencil, ChevronDown, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { AddBudgetDialog } from './AddBudgetDialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface BudgetListProps {
  budgets: BudgetState[];
  onDelete: (id: string) => Promise<any>;
  onSave: (budget: any) => Promise<any>;
  categories: CategoryItem[];
}

export function BudgetList({ budgets, onDelete, onSave, categories }: BudgetListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };



  if (budgets.length === 0) {
    return (
      <div className="finance-card">
        <h3 className="text-lg font-semibold mb-4">Presupuestos del mes</h3>
        <p className="text-muted-foreground text-sm text-center py-6">
          No hay presupuestos configurados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CARD DE TOTALES GLOBALES */}


      {/* LISTA DE TARJETAS INDIVIDUALES EXPANDIBLES */}
      <div className="grid gap-4">
        <Accordion type="single" collapsible className="w-full space-y-3">
          {budgets.map((budgetState, index) => {
            const { budget, spent, percentage, status, transactions, categoryName } = budgetState;
            const safeAmount = budget.amount || 1; // Prevent division by zero
            // Porcentaje ya viene calculado en BudgetState, usamos ese o el local? 
            // BudgetState trae 'percentage' y 'status', mejor usarlos.

            const isOverBudget = status === 'overspent';

            // FIX: Try matching by ID first (more reliable), then by Name
            const categoryItem = categories.find(c => c.id === budget.category_id) ||
              categories.find(c => c.name === budget.category);

            return (
              <AccordionItem
                key={budget.id}
                value={budget.id}
                className="finance-card p-0 border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary rounded-lg text-primary">
                        <ReceiptText className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm">
                        {categoryItem?.name || categoryName || budget.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <AddBudgetDialog
                        editingBudget={{
                          id: budget.id,
                          category_id: budget.category_id || (categoryItem?.id || ''),
                          categoryName: categoryName || budget.category,
                          amount: budget.amount
                        }}
                        monthOverride={budget.month}
                        onAdd={onSave}
                        onDelete={onDelete}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </AddBudgetDialog>
                      <AccordionTrigger
                        className="p-0 hover:no-underline"
                        onClick={() => trackEvent('view_feature', { feature_name: 'budget_detail', category: categoryName })}
                      >
                        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-muted/50">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </div>
                      </AccordionTrigger>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Consumido: {formatCurrency(spent)}</span>
                    <span className={cn("font-medium", isOverBudget ? "text-expense" : "text-foreground")}>
                      Límite: {formatCurrency(budget.amount)}
                    </span>
                  </div>

                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isOverBudget ? 'bg-expense' : 'bg-primary'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <AccordionContent className="px-4 pb-4 pt-2 bg-muted/30 border-t border-dashed">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-tighter">
                    Historial de Transacciones
                  </h4>
                  {/* Aquí mapeas los registros de transacciones si vienen en el objeto budget */}
                  {transactions && transactions.length > 0 ? (
                    <div className="space-y-2">
                      {transactions.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center text-sm bg-background p-2 rounded-md border shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">{t.description || 'Sin descripción'}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString()}</span>
                          </div>
                          <span className="font-bold text-expense">-{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground py-2 italic">
                      No hay transacciones registradas en esta categoría.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}