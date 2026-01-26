import { Budget, CategoryItem } from '@/hooks/useFinanceData';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BudgetListProps {
  budgets: Budget[];
  onDelete: (id: string) => void;
  categories: CategoryItem[];
}

export function BudgetList({ budgets, onDelete, categories }: BudgetListProps) {
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
    <div className="finance-card">
      <h3 className="text-lg font-semibold mb-4">Presupuestos del mes</h3>
      <div className="space-y-4">
        {budgets.map((budget, index) => {
          const spent = budget.spent || 0;
          const percentage = Math.min((spent / budget.amount) * 100, 100);
          const isOverBudget = spent > budget.amount;
          const categoryItem = categories.find(c => c.name === budget.category);

          return (
            <div
              key={budget.id}
              className="animate-fade-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {categoryItem?.name || budget.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    isOverBudget ? 'text-expense' : 'text-foreground'
                  )}>
                    {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-all rounded-sm border-primary/80"
                    onClick={() => onDelete(budget.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
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
          );
        })}
      </div>
    </div>
  );
}
