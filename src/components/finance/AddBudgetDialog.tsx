import { useState, useEffect } from 'react';
import { useFinanceData } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddCategoryDialog } from './AddCategoryDialog';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { budgetSchema, BudgetFormValues } from '@/lib/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { useBudgetsData } from '@/hooks/useBudgetsData';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Target } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface AddBudgetDialogProps {
  onAdd: (budget: { category_id: string; category: string; amount: number; month: string }) => Promise<{ error: any }>;
  editingBudget?: {
    id: string;
    category_id: string;
    categoryName: string;
    amount: number;
  };
  children?: React.ReactNode;
}

export function AddBudgetDialog({ onAdd, editingBudget, children }: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const { categories, addCategory, loading } = useFinanceData();
  const { budgets } = useBudgetsData();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Sync state when editingBudget changes
  useEffect(() => {
    if (editingBudget) {
      reset({
        category_id: editingBudget.category_id,
        category: editingBudget.categoryName,
        amount: editingBudget.amount,
      });
    }
  }, [editingBudget, reset]);

  // Filter only expense categories for budgets
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const onFormSubmit = async (values: BudgetFormValues) => {
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 8) + '01';

    // Force IDs & Log as requested
    console.log('Submitting Budget Data:', {
      category_id: values.category_id,
      category: values.category,
      amount: values.amount,
      month: currentMonth
    });

    const budgetPayload = {
      category_id: values.category_id,
      category_name: values.category || '',
      amount: values.amount,
      month: currentMonth,
    };

    console.log('📦 OBJETO A ENVIAR (Budget):', budgetPayload);

    // Strict validation
    if (!budgetPayload.category_id || !budgetPayload.category_name || budgetPayload.amount <= 0) {
      console.error('❌ VALIDACIÓN FALLIDA (Budget):', budgetPayload);
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
      // Invalidate queries to refresh data automatically
      queryClient.invalidateQueries({ queryKey: ['budgets'] });

      if (!editingBudget) {
        reset();
      }
      setOpen(false);
    }
  };

  const formatDisplayedAmount = (value: number) => {
    if (value === 0 || isNaN(value)) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: number) => void) => {
    const val = e.target.value.replace(/\./g, '');
    const parsed = parseFloat(val);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            className="gap-2 shadow-lg shadow-primary/20"
            aria-label="Nuevo Presupuesto"
            title="Nuevo Presupuesto"
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
          >
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Presupuesto</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3 sm:space-y-4 mt-4">
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
                          const cat = expenseCategories.find(c => c.id === val);
                          if (cat) {
                            setValue('category', cat.name);
                            console.log('Category name set to:', cat.name);
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
                          {expenseCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!editingBudget && (
                      <div className="flex-shrink-0">
                        <AddCategoryDialog type="expense" onAdd={addCategory} />
                      </div>
                    )}
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
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                      <Input
                        className="pl-7 h-11 md:h-9 text-sm"
                        placeholder="0.00"
                        inputMode="decimal"
                        value={formatDisplayedAmount(field.value)}
                        onChange={(e) => handleAmountChange(e, field.onChange)}
                      />
                    </div>
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

            <Button type="submit" className="w-full h-11 md:h-9 text-sm sm:text-base" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (
                isUpdatingExisting ? '¿Actualizar presupuesto existente?' :
                  (editingBudget ? 'Actualizar presupuesto' : 'Guardar presupuesto')
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
