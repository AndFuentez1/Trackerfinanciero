import { useState, useEffect } from 'react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
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
import { cn } from '@/core/utils';

interface CategoryConfig {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  amount: number;
  isRecurrent: boolean;
  month: string;
  budgetId?: string;
}

export function ConfigureBudgetsDialog() {
  const [open, setOpen] = useState(false);
  const { categories, loading: categoriesLoading } = useFinanceData();
  const { budgets, saveBudget, deleteBudget, refreshBudgets } = useBudgetsData();
  const { currency } = useFinance();
  const { toast } = useToast();

  const [configs, setConfigs] = useState<CategoryConfig[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
          budgetId: dbBudget?.id,
        };
      });

      setConfigs(initialConfigs);
    }
  }, [open, categories, budgets]);

  const handleConfigChange = (categoryId: string, field: keyof CategoryConfig, value: CategoryConfig[keyof CategoryConfig]) => {
    setConfigs(prev => prev.map(c => c.categoryId === categoryId ? { ...c, [field]: value } : c));
  };

  const handleSaveCategory = async (config: CategoryConfig) => {
    if (config.amount <= 0) {
      toast({
        title: 'Monto inválido',
        description: `El monto para "${config.categoryName}" debe ser mayor a 0.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(config.categoryId);
    try {
      const targetMonth = `${config.month}-01`;

      const result = await saveBudget({
        category_id: config.categoryId,
        amount: config.amount,
        category_name: config.categoryName,
        month: targetMonth,
        is_recurrent: config.isRecurrent,
      });

      if (!result?.error) {
        toast({
          title: 'Presupuesto guardado',
          description: `${config.categoryName} actualizado correctamente.`,
        });
        refreshBudgets();

        const newBudgetId = (result as { data?: { id?: string } }).data?.id;
        if (newBudgetId) {
          setConfigs(prev => prev.map(c =>
            c.categoryId === config.categoryId ? { ...c, budgetId: newBudgetId } : c
          ));
        }
      } else {
        toast({
          title: 'Error',
          description: `No se pudo guardar el presupuesto para ${config.categoryName}.`,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteCategory = async (config: CategoryConfig) => {
    if (!config.budgetId) return;

    if (!window.confirm(`¿Eliminar el presupuesto de "${config.categoryName}"?`)) return;

    setDeleting(config.categoryId);
    try {
      const result = await deleteBudget(config.budgetId);
      if (!result?.error) {
        toast({
          title: 'Presupuesto eliminado',
          description: `El presupuesto para ${config.categoryName} fue eliminado.`,
        });
        refreshBudgets();
        setConfigs(prev => prev.map(c =>
          c.categoryId === config.categoryId
            ? { ...c, amount: 0, budgetId: undefined, isRecurrent: false, month: getDefaultMonth() }
            : c
        ));
      } else {
        toast({
          title: 'Error',
          description: `No se pudo eliminar el presupuesto para ${config.categoryName}.`,
          variant: 'destructive',
        });
      }
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60 md:text-[15px]"
          aria-label="Configurar Presupuestos"
          title="Configurar Presupuestos"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurar presupuesto</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Configurar Presupuestos</DialogTitle>
          <DialogDescription>
            Define el monto, recurrencia y mes de inicio para cada categoría.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Cargando categorías...</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay categorías de gastos configuradas.</p>
          ) : (
            <div className="divide-y divide-border">
              {configs.map((config) => (
                <div
                  key={config.categoryId}
                  className={cn(
                    'py-4 first:pt-0 last:pb-0',
                    config.budgetId ? 'opacity-100' : 'opacity-80'
                  )}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: config.categoryColor || '#CBD5E1' }}
                    />
                    <span className="font-semibold text-sm text-foreground">{config.categoryName}</span>
                    {config.budgetId && (
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Configurado
                      </span>
                    )}
                  </div>

                  {/* Fields Row: use responsive grid to avoid truncation and ensure adequate spacing on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    {/* Amount Input */}
                    <div className="flex flex-col gap-1 w-full min-w-0">
                      <Label className="text-xs text-muted-foreground">Monto límite</Label>
                      <MoneyInput
                        className="h-10 text-sm w-full"
                        placeholder="0"
                        value={config.amount}
                        onChange={(val) => handleConfigChange(config.categoryId, 'amount', val)}
                      />
                    </div>

                    {/* Month Picker */}
                    <div className="flex flex-col gap-1 w-full min-w-0">
                      <Label className="text-xs text-muted-foreground">
                        {config.isRecurrent ? 'Mes de inicio' : 'Mes de aplicación'}
                      </Label>
                      <Input
                        type="month"
                        className="h-10 text-sm w-full py-0 px-2"
                        value={config.month}
                        onChange={(e) => handleConfigChange(config.categoryId, 'month', e.target.value)}
                      />
                    </div>

                    {/* Recurrent Toggle */}
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <Label className="text-xs text-muted-foreground">Recurrente</Label>
                      <div className="h-10 flex items-center">
                        <Switch
                          id={`recurrent-${config.categoryId}`}
                          checked={config.isRecurrent}
                          onCheckedChange={(checked) =>
                            handleConfigChange(config.categoryId, 'isRecurrent', checked)
                          }
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        size="icon"
                        variant="default"
                        className="h-10 w-10 shrink-0"
                        onClick={() => handleSaveCategory(config)}
                        disabled={saving === config.categoryId}
                        title="Guardar"
                      >
                        {saving === config.categoryId ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>

                      {config.budgetId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteCategory(config)}
                          disabled={deleting === config.categoryId}
                          title="Eliminar presupuesto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Recurrent hint */}
                  {config.isRecurrent && (
                    <p className="text-xs text-muted-foreground mt-2 pl-5">
                      Se aplicará automáticamente desde {config.month} en adelante.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
