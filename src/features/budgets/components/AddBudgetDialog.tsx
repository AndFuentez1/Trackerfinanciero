import { useState, useEffect, useMemo } from 'react';
import { trackEvent } from '@/lib/analytics';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddCategoryDialog } from '@/features/categories/components/AddCategoryDialog';
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
  onDelete?: (budgetId: string) => Promise<{ error: any }>;
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

  const typeOptions = [
    { value: 'expense', label: 'Gasto' },
    { value: 'income', label: 'Ingreso' },
  ];
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };

  const getCurrencyPadding = () => {
    const symbol = getCurrencySymbol();
    if (symbol.length > 2) return 'pl-16';
    if (symbol.length === 2) return 'pl-12';
    return 'pl-9';
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

  // Filtrar categorías según el tipo seleccionado
  const filteredCategories = useMemo(() =>
    categories
      .filter(c => c.type === selectedType)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [categories, selectedType]);

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
      // Si la categoría editada es de ingreso, setear tipo
      const cat = categories.find(c => c.id === editingBudget.category_id);
      if (cat && (cat.type === 'income' || cat.type === 'expense')) {
        setSelectedType(cat.type);
      }
    }
  }, [editingBudget, reset, categories]);

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
    if (!budgetPayload.category_id || !budgetPayload.category_name || budgetPayload.amount <= 0) {
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
        trackEvent('budget_created', {
          category: values.category,
          amount: values.amount
        });
        trackEvent('onboarding_step_completed', {
          step_name: 'budget_created'
        });
        reset();
      }
      setOpen(false);
    } else {
    }
  };

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (!editingBudget?.id || !onDelete) return;

    const result = await onDelete(editingBudget.id);
    if (!result?.error) {
      setOpen(false);
      setShowDeleteAlert(false);
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
            variant="default"
            size="sm"
            className="gap-2 min-w-[140px] text-[15px] py-2 flex items-center justify-center border border-primary hover:bg-primary/90 hover:text-white"
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
            <span className="hidden sm:flex flex-row items-center gap-2">Nuevo Presupuesto <Target className="h-3 w-3" /></span>
            <span className="sm:hidden flex flex-row items-center gap-2">Nuevo Presupuesto <Target className="h-3 w-3" /></span>
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
            {/* Dropdown de tipo (Gasto/Ingreso) */}
            <div className="space-y-2">
              <Label className="text-sm">Tipo</Label>
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val as 'expense' | 'income');
                  // Limpiar categoría seleccionada al cambiar tipo
                  setValue('category_id', '');
                  setValue('category', '');
                }}
                disabled={!!editingBudget}
              >
                <SelectTrigger className="h-11 md:h-9 text-sm border-[hsl(var(--color-primary)/0.8)] bg-white hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-xl">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                          const cat = filteredCategories.find(c => c.id === val);
                          if (cat) {
                            setValue('category', cat.name);
                          }
                        }}
                        value={field.value}
                        disabled={!!editingBudget}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 md:h-9 text-sm border-[hsl(var(--color-primary)/0.8)] bg-white hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-xl">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!editingBudget && (
                      <div className="flex-shrink-0">
                        <AddCategoryDialog type={selectedType} onAdd={addCategory} trigger={
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-11 md:h-9 border-[hsl(var(--color-primary)/0.8)] rounded-xl hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          >
                            Nueva categoría
                          </Button>
                        } />
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
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
                      <Input
                        className={`${getCurrencyPadding()} h-11 md:h-9 text-sm placeholder:text-[90%]`}
                        placeholder={getPlaceholderAmount()}
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
                  onClick={handleDeleteClick}
                  disabled={isSubmitting}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el presupuesto para esta categoría. No afecta las transacciones existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog >
  );
}
