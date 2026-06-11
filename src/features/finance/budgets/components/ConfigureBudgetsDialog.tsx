import { useState, useEffect } from 'react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { Settings, Trash2, Check } from 'lucide-react';

export function ConfigureBudgetsDialog() {
  const [open, setOpen] = useState(false);
  const { categories, loading: categoriesLoading } = useFinanceData();
  const { budgets, saveBudget, deleteBudget, refreshBudgets } = useBudgetsData();
  const { currency } = useFinance();
  const { toast } = useToast();

  // Keep local state for budget settings per category
  interface CategoryConfig {
    categoryId: string;
    categoryName: string;
    categoryColor?: string;
    amount: number;
    isRecurrent: boolean;
    month: string;
    budgetId?: string; // if already exists
  }

  const [configs, setConfigs] = useState<CategoryConfig[]>([]);

  // Default month: YYYY-MM
  const getDefaultMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Load configs when dialog opens or budgets change
  useEffect(() => {
    if (open && categories.length > 0) {
      const expenseAndSavingCategories = categories.filter(c => c.type === 'expense' || c.type === 'saving');
      
      const initialConfigs = expenseAndSavingCategories.map(cat => {
        // Find existing budget for this category
        const budgetState = budgets.find(b => b.budget.category_id === cat.id);
        const dbBudget = budgetState?.budget;

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          categoryColor: cat.color || undefined,
          amount: dbBudget ? Number(dbBudget.amount) : 0,
          isRecurrent: dbBudget ? !!dbBudget.is_recurrent : false,
          month: dbBudget && dbBudget.month 
            ? dbBudget.month.substring(0, 7) 
            : getDefaultMonth(),
          budgetId: dbBudget?.id
        };
      });

      setConfigs(initialConfigs);
    }
  }, [open, categories, budgets]);

  const handleConfigChange = (categoryId: string, field: keyof CategoryConfig, value: any) => {
    setConfigs(prev => prev.map(c => c.categoryId === categoryId ? { ...c, [field]: value } : c));
  };

  const handleSaveCategory = async (config: CategoryConfig) => {
    if (config.amount <= 0) {
      toast({
        title: 'Monto inválido',
        description: `El monto para la categoría ${config.categoryName} debe ser mayor a 0.`,
        variant: 'destructive',
      });
      return;
    }

    const targetMonth = `${config.month}-01`;

    const result = await saveBudget({
      category_id: config.categoryId,
      amount: config.amount,
      category_name: config.categoryName,
      month: targetMonth,
      is_recurrent: config.isRecurrent
    });

    if (!result?.error) {
      toast({
        title: 'Presupuesto Guardado',
        description: `Presupuesto para ${config.categoryName} guardado correctamente.`,
      });
      refreshBudgets();
      
      // Update config with budgetId if returned
      const newBudgetId = (result as any).data?.id;
      if (newBudgetId) {
        setConfigs(prev => prev.map(c => c.categoryId === config.categoryId ? { ...c, budgetId: newBudgetId } : c));
      }
    } else {
      toast({
        title: 'Error',
        description: `No se pudo guardar el presupuesto para ${config.categoryName}.`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (config: CategoryConfig) => {
    if (!config.budgetId) return;

    if (confirm(`¿Estás seguro de que deseas eliminar el presupuesto de ${config.categoryName}?`)) {
      const result = await deleteBudget(config.budgetId);
      if (!result?.error) {
        toast({
          title: 'Presupuesto Eliminado',
          description: `El presupuesto para ${config.categoryName} ha sido eliminado.`,
        });
        refreshBudgets();
        setConfigs(prev => prev.map(c => c.categoryId === config.categoryId ? { ...c, amount: 0, budgetId: undefined, isRecurrent: false } : c));
      } else {
        toast({
          title: 'Error',
          description: `No se pudo eliminar el presupuesto para ${config.categoryName}.`,
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex items-center justify-center hover:bg-primary hover:text-primary-foreground md:text-[15px]"
          aria-label="Configurar Presupuestos"
          title="Configurar Presupuestos"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurar presupuesto</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Configurar Presupuestos</DialogTitle>
          <DialogDescription>
            Gestiona los presupuestos recurrentes y específicos para cada categoría de manera directa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando categorías...</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay categorías configuradas.</p>
          ) : (
            <div className="divide-y divide-border">
              {configs.map((config) => (
                <div key={config.categoryId} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-[150px]">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: config.categoryColor || '#CBD5E1' }}
                    />
                    <span className="font-semibold text-sm">{config.categoryName}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 flex-1 md:justify-end">
                    {/* Amount Input */}
                    <div className="w-[120px]">
                      <MoneyInput
                        className="h-9 text-xs"
                        placeholder="Monto"
                        value={config.amount}
                        onChange={(val) => handleConfigChange(config.categoryId, 'amount', val)}
                      />
                    </div>

                    {/* Recurrent Checklist */}
                    <div className="flex items-center gap-1.5 border rounded px-2.5 py-1.5 bg-background">
                      <input
                        type="checkbox"
                        id={`recurrent-${config.categoryId}`}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={config.isRecurrent}
                        onChange={(e) => handleConfigChange(config.categoryId, 'isRecurrent', e.target.checked)}
                      />
                      <label 
                        htmlFor={`recurrent-${config.categoryId}`}
                        className="text-xs font-medium cursor-pointer select-none"
                      >
                        Recurrente
                      </label>
                    </div>

                    {/* Month Picker */}
                    <div className="w-[120px]">
                      <Input
                        type="month"
                        className="h-9 text-xs py-0 px-2"
                        value={config.month}
                        onChange={(e) => handleConfigChange(config.categoryId, 'month', e.target.value)}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="default"
                        className="h-9 w-9"
                        onClick={() => handleSaveCategory(config)}
                        title="Guardar"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      
                      {config.budgetId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCategory(config)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
