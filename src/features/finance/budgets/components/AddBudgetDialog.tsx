import { useState, useEffect, useMemo } from 'react';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Label } from '@/shared/ui/label';
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
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { BudgetFormValues } from '@/lib/schemas';
import { budgetSchema } from '@/lib/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useBudgetsData } from '@/features/finance/hooks/useBudgetsData';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { useToast } from '@/shared/hooks/use-toast';
import { AlertCircle, Target } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';

interface AddBudgetDialogProps {
  onAdd: (budget: { id?: string; category_id: string; category: string; amount: number; month: string; is_recurrent?: boolean }) => Promise<{ error: unknown }>;
  onDelete?: (budgetId: string) => Promise<{ error: unknown }>;
  monthOverride?: string;
  editingBudget?: {
    id: string;
    category_id: string;
    categoryName: string;
    amount: number;
    is_recurrent?: boolean;
    month?: string;
  };
  children?: React.ReactNode;
}

export function AddBudgetDialog({ onAdd, onDelete, editingBudget, children, monthOverride }: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const { categories, addCategory, loading } = useFinanceData();
  const { rawBudgets } = useBudgetsData();
  const { currency, decimalPlaces } = useFinance();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };



  const getPlaceholderAmount = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `100000${decimals}` : '100000';
  };

  const defaultMonth = monthOverride
    ? monthOverride.substring(0, 7)
    : (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

  const form = useForm<BudgetFormValues & { is_recurrent: boolean; month: string }>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: editingBudget?.category_id || '',
      category: editingBudget?.categoryName || '',
      amount: editingBudget?.amount || 0,
      is_recurrent: editingBudget?.is_recurrent || false,
      month: editingBudget?.month ? editingBudget.month.substring(0, 7) : defaultMonth,
    },
  });

  const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = form;

  const watchedCategoryId = useWatch({ control, name: 'category_id' });
  const watchIsRecurrent = useWatch({ control, name: 'is_recurrent' });
  const watchedMonth = useWatch({ control, name: 'month' });

  const existingBudget = rawBudgets.find(b => {
    if (b.category_id !== watchedCategoryId) { return false; }
    if (editingBudget && b.id === editingBudget.id) { return false; }
    if (b.is_recurrent || watchIsRecurrent) { return true; }
    return b.month?.substring(0, 7) === watchedMonth;
  });
  const isUpdatingExisting = !!existingBudget && !editingBudget;

  const [activeTab, setActiveTab] = useState<'expense' | 'saving'>('expense');
  const hasSavingCategories = categories.some(c => c.type === 'saving');

  // Sync state when editingBudget changes or dialog opens
  useEffect(() => {
    if (editingBudget && open) {
      reset({
        category_id: editingBudget.category_id,
        category: editingBudget.categoryName,
        amount: editingBudget.amount,
        is_recurrent: editingBudget.is_recurrent || false,
        month: editingBudget.month ? editingBudget.month.substring(0, 7) : defaultMonth,
      });
      const cat = categories.find(c => c.id === editingBudget.category_id);
      if (cat?.type === 'saving') {
        setActiveTab('saving');
      } else {
        setActiveTab('expense');
      }
    }
  }, [editingBudget, open, reset, categories, defaultMonth]);

  // Filter categories based on functionality.
  const availableCategories = useMemo(() =>
    categories
      .filter(c => {
        if (editingBudget && editingBudget.category_id === c.id) { return true; }
        return c.type === activeTab;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [categories, editingBudget, activeTab]);

  const onFormSubmit = async (values: BudgetFormValues & { is_recurrent: boolean; month: string }) => {
    const now = new Date();
    const targetMonth = values.month ? `${values.month}-01` : (monthOverride || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);

    // Strict validation
    if (!values.category_id || Number.isNaN(values.amount) || values.amount < 0) {
      toast({
        title: 'Error de validación',
        description: 'Debes seleccionar una categoría y el monto debe ser 0 o mayor.',
        variant: 'destructive',
      });
      return;
    }

    const result = await onAdd({
      id: editingBudget?.id,
      category_id: values.category_id,
      category: values.category,
      amount: values.amount,
      month: targetMonth,
      is_recurrent: values.is_recurrent,
    });

    if (!result?.error) {
      const isUpdate = !!editingBudget;

      toast({
        title: 'Éxito',
        description: isUpdate ? 'Presupuesto actualizado correctamente' : 'Presupuesto creado correctamente',
      });

      if (!isUpdate) {
        reset();
      }
      setOpen(false);
    } else {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el presupuesto. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!editingBudget?.id || !onDelete) { return; }

    if (confirm('¿Estás seguro de que deseas eliminar este presupuesto?')) {
      const result = await onDelete(editingBudget.id);
      if (!result?.error) {
        setOpen(false);
      }
    }
  };



  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            onClick={(e) => {
              if (loading) {
                e.preventDefault();
                return;
              }
              if (categories.length === 0) {
                e.preventDefault();
                toast({
                  title: "Configuración requerida",
                  description: "Primero debes configurar al menos una categoría de gasto.",
                  variant: "destructive"
                });
              }
            }}
            variant="default"
            size="sm"
            className="inline-flex w-auto min-w-[190px] gap-2 px-4 py-2 items-center justify-center whitespace-nowrap hover:bg-primary/70 hover:text-white"
            aria-label="Nuevo Presupuesto"
            title="Nuevo Presupuesto"
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo presupuesto</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Define un presupuesto mensual para controlar tus gastos por categoría.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3 sm:space-y-4 mt-4">
            {!editingBudget && (
              <Tabs value={activeTab} onValueChange={(val) => {
                setActiveTab(val as 'expense' | 'saving');
                setValue('category_id', '');
                setValue('category', '');
              }}>
                <TabsList className={`grid w-full mb-2 ${hasSavingCategories ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <TabsTrigger value="expense">Gastos</TabsTrigger>
                  {hasSavingCategories && (
                    <TabsTrigger value="saving">Ahorro</TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            )}

            <FormField
              control={control}
              name="category_id"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">Categoría</FormLabel>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const cat = availableCategories.find(c => c.id === val);
                          if (cat) {
                            setValue('category', cat.name);

                          }
                        }}
                        value={field.value}
                        disabled={!!editingBudget}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 md:h-9 text-sm">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                          {!editingBudget && (
                            <div className="border-t border-border/50 px-1 py-1 mt-1">
                              <AddCategoryDialog
                                type={activeTab}
                                onAdd={addCategory}
                                onSuccess={(cat) => {
                                  setValue('category_id', cat.id);
                                  setValue('category', cat.name);
                                }}
                              />
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">Monto máximo</FormLabel>
                  <FormControl>
                    <MoneyInput
                      className="h-10 text-sm w-full placeholder:text-[90%]"
                      placeholder={getPlaceholderAmount()}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="is_recurrent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">Presupuesto recurrente</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Aplica automáticamente para todos los meses a partir del mes de inicio.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="month"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm">
                    {watchIsRecurrent ? 'Mes de inicio (recurrencia)' : 'Mes de aplicación'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="month"
                      className="h-10 text-sm w-full"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isUpdatingExisting && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800 p-2 sm:p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <AlertDescription className="text-xs ml-2">
                  Ya tienes un presupuesto para esta categoría. Se actualizará el monto.
                </AlertDescription>
              </Alert>
            )}

            <div className={`grid gap-2 ${editingBudget && onDelete ? "grid-cols-2" : "grid-cols-1"}`}>
              <Button type="submit" className="w-full h-11 md:h-9 text-sm sm:text-base font-medium" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (
                  editingBudget ? 'Actualizar' : 'Guardar presupuesto'
                )}
              </Button>
              {editingBudget && onDelete && (
                <Button
                  type="button"
                  variant="default"
                  className="w-full h-11 md:h-9 text-sm font-medium text-destructive hover:bg-destructive/10 border-destructive/20"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}








