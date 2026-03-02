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
  onAdd: (budget: { category_id: string; category: string; amount: number; month: string }) => Promise<{ error: unknown }>;
  onDelete?: (budgetId: string) => Promise<{ error: unknown }>;
  monthOverride?: string;
  editingBudget?: {
    id: string;
    category_id: string;
    categoryName: string;
    amount: number;
  };
  children?: React.ReactNode;
}

export function AddBudgetDialog({ onAdd, onDelete, editingBudget, children, monthOverride }: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const { categories, addCategory, loading } = useFinanceData();
  const { budgets } = useBudgetsData();
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

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: editingBudget?.category_id || '',
      category: editingBudget?.categoryName || '',
      amount: editingBudget?.amount || 0,
    },
  });

  const { control, handleSubmit, reset, setValue, formState: { isSubmitting } } = form;

  const watchedCategoryId = useWatch({ control, name: 'category_id' });

  const existingBudget = budgets.find(b => b.budget.category_id === watchedCategoryId);
  const isUpdatingExisting = existingBudget && (!editingBudget || editingBudget.category_id !== watchedCategoryId);

  const [activeTab, setActiveTab] = useState<'expense' | 'saving'>('expense');
  const hasSavingCategories = categories.some(c => c.type === 'saving');

  // Sync state when editingBudget changes
  useEffect(() => {
    if (editingBudget) {
      reset({
        category_id: editingBudget.category_id,
        category: editingBudget.categoryName,
        amount: editingBudget.amount,
      });
      const cat = categories.find(c => c.id === editingBudget.category_id);
      if (cat?.type === 'saving') {
        setActiveTab('saving');
      } else {
        setActiveTab('expense');
      }
    }
  }, [editingBudget, reset, categories]);

  // Filter categories based on functionality. We allow Expense and Income now for projection purposes.
  // Note: Parent component can control this if needed in future, but currently we enable both.
  const availableCategories = useMemo(() =>
    categories
      .filter(c => {
        if (editingBudget && editingBudget.category_id === c.id) { return true; }
        return c.type === activeTab;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [categories, editingBudget, activeTab]);

  const onFormSubmit = async (values: BudgetFormValues) => {
    const now = new Date();
    const currentMonth = monthOverride || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const budgetPayload = {
      category_id: values.category_id,
      category_name: values.category || '',
      amount: values.amount,
      month: currentMonth,
    };

    // Strict validation
    if (!budgetPayload.category_id || budgetPayload.amount <= 0) {
      toast({
        title: 'Error de validación',
        description: 'Debes seleccionar una categoría y el monto debe ser mayor a 0.',
        variant: 'destructive',
      });
      return;
    }

    const result = await onAdd({
      category_id: budgetPayload.category_id,
      category: budgetPayload.category_name,
      amount: budgetPayload.amount,
      month: budgetPayload.month,
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
            size="sm"
            className="gap-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60 md:text-[15px]"
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
                      className="h-11 md:h-9 text-sm placeholder:text-[90%]"
                      placeholder={getPlaceholderAmount()}
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








