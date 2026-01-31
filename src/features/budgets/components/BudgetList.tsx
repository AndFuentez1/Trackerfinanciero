import { Budget, CategoryItem } from '@/hooks/useFinanceData';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className="shadow-sm border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
          <p>No hay presupuestos configurados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="text-lg">Presupuestos del mes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-all rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
      </CardContent>
    </Card>
  );
}
