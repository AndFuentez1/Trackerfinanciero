import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { AddCategoryDialog } from '@/features/finance/categories/components/AddCategoryDialog';
import { useToast } from '@/shared/hooks/use-toast';
import { Settings, Trash2, Check, Plus } from 'lucide-react';
import { cn } from '@/core/utils';
import { resolveCanonicalBudgetForCategory } from '@/features/finance/utils/budgetUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';

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
  const { categories, loading: categoriesLoading, addCategory } = useFinanceData();
  const { rawBudgets, saveBudget, deleteBudget, refreshBudgets } = useBudgetsData();
  const { currency } = useFinance();
  const { toast } = useToast();

  const [configs, setConfigs] = useState<CategoryConfig[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const prevOpenRef = useRef(false);

  // Estados locales para la creación de presupuestos
  const [activeTab, setActiveTab] = useState<'configured' | 'create'>('configured');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [createAmount, setCreateAmount] = useState<number>(0);
  const [createIsRecurrent, setCreateIsRecurrent] = useState<boolean>(false);

  const getDefaultMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [createMonth, setCreateMonth] = useState<string>(getDefaultMonth());

  const buildConfigFromBudget = useCallback((categoryId: string): CategoryConfig | null => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat || (cat.type !== 'expense' && cat.type !== 'saving')) {
      return null;
    }

    const dbBudget = resolveCanonicalBudgetForCategory(categoryId, rawBudgets);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color || undefined,
      amount: dbBudget ? Number(dbBudget.amount) : 0,
      isRecurrent: dbBudget ? !!dbBudget.is_recurrent : false,
      month: dbBudget?.month
        ? dbBudget.month.substring(0, 7)
        : getDefaultMonth(),
      budgetId: dbBudget?.id,
    };
  }, [categories, rawBudgets]);

  // Cargar presupuestos existentes al abrir el diálogo
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened && categories.length > 0) {
      const categoryIdsWithBudgets = [
        ...new Set(rawBudgets.map(b => b.category_id).filter(Boolean) as string[]),
      ];

      const initialConfigs = categoryIdsWithBudgets
        .map(buildConfigFromBudget)
        .filter((c): c is CategoryConfig => c !== null);

      setConfigs(initialConfigs);

      // Resetear estados de creación
      setCreateCategoryId('');
      setCreateAmount(0);
      setCreateIsRecurrent(false);
      setCreateMonth(getDefaultMonth());
      setActiveTab('configured');
    }
  }, [open, categories, rawBudgets, buildConfigFromBudget]);

  const configuredConfigs = useMemo(() =>
    configs.filter(c => c.budgetId !== undefined),
    [configs]
  );

  const availableCategoriesToAdd = useMemo(() =>
    categories
      .filter(c => (c.type === 'expense' || c.type === 'saving') && !configs.some(cfg => cfg.categoryId === c.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [categories, configs]
  );

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
        id: config.budgetId,
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
        await refreshBudgets();

        const newBudgetId = (result as { data?: { id?: string } }).data?.id;
        setConfigs(prev => prev.map(c =>
          c.categoryId === config.categoryId
            ? {
              ...c,
              budgetId: newBudgetId ?? c.budgetId,
              isRecurrent: config.isRecurrent,
              month: config.month,
            }
            : c
        ));
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
    if (!window.confirm(`¿Eliminar el presupuesto de "${config.categoryName}"?`)) {
      return;
    }

    if (!config.budgetId) {
      setConfigs(prev => prev.filter(c => c.categoryId !== config.categoryId));
      return;
    }

    setDeleting(config.categoryId);
    try {
      const result = await deleteBudget(config.budgetId);
      if (!result?.error) {
        toast({
          title: 'Presupuesto eliminado',
          description: `El presupuesto para ${config.categoryName} fue eliminado.`,
        });
        await refreshBudgets();
        setConfigs(prev => prev.filter(c => c.categoryId !== config.categoryId));
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

  const handleCreateBudget = async () => {
    if (!createCategoryId) {
      toast({
        title: 'Categoría requerida',
        description: 'Por favor, selecciona una categoría para el presupuesto.',
        variant: 'destructive',
      });
      return;
    }

    if (createAmount <= 0) {
      toast({
        title: 'Monto inválido',
        description: 'El monto del presupuesto debe ser mayor a 0.',
        variant: 'destructive',
      });
      return;
    }

    const cat = categories.find(c => c.id === createCategoryId);
    if (!cat) return;

    setSaving(createCategoryId);
    try {
      const targetMonth = `${createMonth}-01`;

      const result = await saveBudget({
        category_id: createCategoryId,
        amount: createAmount,
        category_name: cat.name,
        month: targetMonth,
        is_recurrent: createIsRecurrent,
      });

      if (!result?.error) {
        toast({
          title: 'Presupuesto creado',
          description: `El presupuesto para "${cat.name}" fue creado correctamente.`,
        });
        await refreshBudgets();

        const newBudgetId = (result as { data?: { id?: string } }).data?.id;
        setConfigs(prev => [
          ...prev,
          {
            categoryId: createCategoryId,
            categoryName: cat.name,
            categoryColor: cat.color || undefined,
            amount: createAmount,
            isRecurrent: createIsRecurrent,
            month: createMonth,
            budgetId: newBudgetId,
          }
        ]);

        // Resetear formulario y redirigir
        setCreateCategoryId('');
        setCreateAmount(0);
        setCreateIsRecurrent(false);
        setActiveTab('configured');
      } else {
        toast({
          title: 'Error',
          description: `No se pudo crear el presupuesto para "${cat.name}".`,
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="inline-flex w-auto min-w-[190px] gap-2 px-4 py-2 items-center justify-center whitespace-nowrap hover:bg-primary/70 hover:text-white"
          title="Configurar Presupuestos"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Configurar presupuesto</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Configurar Presupuestos</DialogTitle>
          <DialogDescription>
            Gestiona los límites mensuales y recurrencias de tus presupuestos.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'configured' | 'create')} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="configured">Presupuestos configurados</TabsTrigger>
            <TabsTrigger value="create">Crear presupuesto</TabsTrigger>
          </TabsList>

          <TabsContent value="configured" className="space-y-3 mt-0">
            {categoriesLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Cargando categorías...</p>
            ) : configuredConfigs.length === 0 ? (
              <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed border-border p-4 flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground font-medium">
                  No hay presupuestos configurados.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setActiveTab('create')}
                  className="mt-1 text-primary font-bold hover:underline"
                >
                  Configurar tu primer presupuesto →
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {configuredConfigs.map((config) => (
                  <div
                    key={config.categoryId}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: config.categoryColor || '#CBD5E1' }}
                      />
                      <span className="font-semibold text-sm text-foreground">{config.categoryName}</span>
                      <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Configurado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <Label className="text-xs text-muted-foreground">Monto límite</Label>
                        <MoneyInput
                          className="h-10 text-sm w-full"
                          placeholder="0"
                          value={config.amount}
                          onChange={(val) => handleConfigChange(config.categoryId, 'amount', val)}
                        />
                      </div>

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
                      </div>
                    </div>

                    {config.isRecurrent && (
                      <p className="text-xs text-muted-foreground mt-2 pl-5">
                        Se aplicará automáticamente desde {config.month} en adelante.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-0">
            <div className="space-y-4 p-5 border border-border/50 rounded-xl bg-card/40 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categoría <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    {availableCategoriesToAdd.length > 0 ? (
                      <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                        <SelectTrigger className="h-10 text-sm flex-1">
                          <SelectValue placeholder="Seleccionar categoría..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategoriesToAdd.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground flex-1 py-2 italic">
                        Todas las categorías ya tienen un presupuesto.
                      </p>
                    )}
                    <AddCategoryDialog
                      type="expense"
                      onAdd={addCategory}
                      onSuccess={(cat) => {
                        setCreateCategoryId(cat.id);
                      }}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2 shrink-0 h-10" title="Nueva categoría">
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Nueva</span>
                        </Button>
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Monto límite <span className="text-destructive">*</span></Label>
                  <MoneyInput
                    className="h-10 text-sm w-full"
                    placeholder="0"
                    value={createAmount}
                    onChange={setCreateAmount}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {createIsRecurrent ? 'Mes de inicio (recurrencia)' : 'Mes de aplicación'}
                  </Label>
                  <Input
                    type="month"
                    className="h-10 text-sm w-full py-0 px-2"
                    value={createMonth}
                    onChange={(e) => setCreateMonth(e.target.value)}
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-end pb-1">
                  <div className="flex items-center justify-between border border-border/40 p-3 rounded-lg bg-background/50 h-10">
                    <Label htmlFor="create-recurrent" className="text-sm font-medium cursor-pointer">
                      ¿Es recurrente?
                    </Label>
                    <Switch
                      id="create-recurrent"
                      checked={createIsRecurrent}
                      onCheckedChange={setCreateIsRecurrent}
                    />
                  </div>
                </div>
              </div>

              {createIsRecurrent && (
                <p className="text-xs text-muted-foreground pl-1">
                  💡 Se aplicará automáticamente de forma mensual desde {createMonth} en adelante.
                </p>
              )}

              <Button
                onClick={handleCreateBudget}
                disabled={saving !== null || !createCategoryId || createAmount <= 0}
                className="w-full h-11 font-semibold rounded-xl mt-2 text-primary-foreground bg-primary hover:bg-primary/80 transition-all shadow-md active:scale-[0.99]"
              >
                {saving !== null ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Crear presupuesto
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
