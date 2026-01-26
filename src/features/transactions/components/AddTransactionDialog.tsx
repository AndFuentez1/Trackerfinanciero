import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { TransactionType, Transaction, useFinanceData } from '@/hooks/useFinanceData';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { insertTransactionSchema, TransactionFormValues } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { AddCategoryDialog } from '@/features/categories/components/AddCategoryDialog';
import { getTodayLocalDate } from '@/lib/dateUtils';

export interface AddTransactionDialogProps {
  onAdd?: (transaction: Omit<Transaction, 'id'>) => Promise<{ error?: unknown } | void>;
  onUpdateTransaction?: (id: string, updates: any) => Promise<void>;
  transactionToEdit?: Transaction | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  categories?: any[];
  paymentMethods?: any[];
  onAddTransfer?: (fromId: string, toId: string, amount: number, description: string, date: string) => Promise<{ error: any }>;
}

const typeOptions: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'saving', label: 'Ahorro' },
  { value: 'investment', label: 'Inversión' },
  { value: 'transfer_in', label: 'Transferencia' },
];

export function AddTransactionDialog({
  onAdd,
  onUpdateTransaction,
  transactionToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  categories: propCategories,
  paymentMethods: propPaymentMethods,
  onAddTransfer
}: AddTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [showAlert, setShowAlert] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { categories: contextCategories, paymentMethods: contextPaymentMethods, addCategory, loading } = useFinanceData();
  const { currency, decimalPlaces } = useFinance();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };

  const getCurrencyPadding = () => {
    const symbol = getCurrencySymbol();
    // COP, ARS, CLP, Mex$ necesitan más espacio
    if (symbol.length > 2) return 'pl-16';
    if (symbol.length === 2) return 'pl-12';
    return 'pl-9';
  };

  const getPlaceholderAmount = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `100000${decimals}` : '100000';
  };

  // Use props if provided (for edit mode from dashboard), else context
  const categories = propCategories || contextCategories;
  const paymentMethods = propPaymentMethods || contextPaymentMethods;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(insertTransactionSchema),
    defaultValues: {
      type: 'expense',
      category: '',
      category_id: '',
      amount: 0,
      description: '',
      date: getTodayLocalDate(),
      payment_method_id: '',
      to_payment_method_id: '',
    },
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (transactionToEdit && open) {
      form.reset({
        type: transactionToEdit.type as TransactionType,
        category: transactionToEdit.category,
        category_id: transactionToEdit.category_id || '',
        amount: transactionToEdit.amount,
        description: transactionToEdit.description,
        date: transactionToEdit.date,
        payment_method_id: transactionToEdit.payment_method_id || '',
        to_payment_method_id: '',
      });
    } else if (!transactionToEdit && open && !isControlled) {
      // Reset only if opening in "Add" mode (uncontrolled)
      form.reset({
        type: 'expense',
        category: '',
        category_id: '',
        amount: 0,
        description: '',
        date: getTodayLocalDate(),
        payment_method_id: '',
        to_payment_method_id: '',
      });
    }
  }, [transactionToEdit, open, isControlled, form]);

  const { control, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = form;
  const currentType = watch('type');

  // Filter categories based on selected type
  const availableCategories = useMemo(() => {
    return categories
      .filter(c => c.type === currentType)
      .map(c => ({ value: c.id, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
  }, [currentType, categories]);

  // Set first available category when type changes
  useEffect(() => {
    if (availableCategories.length > 0) {
      const currentCategoryId = form.getValues('category_id');
      if (!availableCategories.find(c => c.value === currentCategoryId)) {
        setValue('category_id', availableCategories[0].value);
        setValue('category', availableCategories[0].label);
      }
    } else {
      setValue('category_id', '');
      setValue('category', '');
    }
  }, [currentType, availableCategories, setValue]);

  // Validation before opening form
  const validateBeforeOpen = () => {
    if (loading) return;

    if (categories.length === 0 || paymentMethods.length === 0) {
      setShowAlert(true);
      return;
    }
    setOpen(true);
  };

  const handleNavigateToSettings = () => {
    setShowAlert(false);
    navigate('/configuracion');
  };

  const onFormSubmit = async (values: TransactionFormValues) => {
    // 1. Handle Transfer separately if onAddTransfer is provided
    if (values.type === 'transfer_in' && onAddTransfer) {
      if (!values.payment_method_id || !values.to_payment_method_id) {
        toast({
          title: 'Error de validación',
          description: 'Debes seleccionar cuenta de origen y destino.',
          variant: 'destructive',
        });
        return;
      }
      if (values.payment_method_id === values.to_payment_method_id) {
        toast({
          title: 'Error de validación',
          description: 'Las cuentas de origen y destino deben ser diferentes.',
          variant: 'destructive',
        });
        return;
      }

      const result = await onAddTransfer(
        values.payment_method_id,
        values.to_payment_method_id,
        values.amount,
        values.description || 'Transferencia',
        values.date
      );

      if (!result?.error) {
        toast({ title: 'Éxito', description: 'Transferencia realizada correctamente.' });
        reset();
        setOpen(false);
      }
      return;
    }

    // 2. Standard Transaction Logic...
    // Sync category name if missing (safety check)
    let categoryName = values.category;
    if (!categoryName && values.category_id) {
      categoryName = categories.find(c => c.id === values.category_id)?.name || '';
    }

    // Map transfer types to database storage format
    let dbType: TransactionType = values.type;
    if (values.type === 'transfer_in') {
      categoryName = 'Transferencia';
    }

    const transactionData: Omit<Transaction, 'id'> = {
      type: dbType,
      category: categoryName,
      category_id: values.category_id,
      amount: values.amount,
      description: values.description,
      date: values.date,
      payment_method_id: values.payment_method_id === 'none' || !values.payment_method_id ? null : values.payment_method_id,
      installments: values.installments || 1,
    };



    // Strict validation - skip category for transfers
    if (values.type !== 'transfer_in') {
      if (!transactionData.category_id || !transactionData.category || transactionData.amount <= 0) {

        toast({
          title: 'Error de validación',
          description: 'Campos obligatorios incompletos (Categoría o Monto).',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // For transfers, just validate amount
      if (transactionData.amount <= 0) {
        toast({
          title: 'Error de validación',
          description: 'El monto debe ser mayor a 0.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Credit Card specific validation
    if (values.payment_method_id) {
      const selectedPM = paymentMethods.find(pm => pm.id === values.payment_method_id);

      if (selectedPM && selectedPM.type === 'credit') {
        const creditLimit = selectedPM.credit_limit ? Number(selectedPM.credit_limit) : 0;
        let currentDebt = Number(selectedPM.balance);

        // If editing an existing income (payment) on the SAME card, 
        // we add back the old amount to get the actual debt capacity.
        if (transactionToEdit && transactionToEdit.payment_method_id === values.payment_method_id && transactionToEdit.type === 'income') {
          currentDebt += Number(transactionToEdit.amount);
        }

        // Validar que la deuda no exceda el límite de crédito
        if (creditLimit > 0) {
          if (values.type === 'income') {
            // Payment: check that debt won't go below 0
            if (currentDebt <= 0) {
              toast({
                title: 'Validación de Tarjeta',
                description: 'Esta tarjeta no tiene deuda pendiente.',
                variant: 'destructive',
              });
              return;
            }
            if (values.amount > currentDebt) {
              toast({
                title: 'Validación de Tarjeta',
                description: 'El pago no puede exceder la deuda total de esta tarjeta.',
                variant: 'destructive',
              });
              return;
            }
          } else if (values.type === 'expense') {
            // Expense: check that debt won't exceed limit
            const newDebt = currentDebt + values.amount;
            if (newDebt > creditLimit) {
              toast({
                title: 'Límite de Crédito Excedido',
                description: `El gasto excedería tu límite de crédito. Disponible: $${(creditLimit - currentDebt).toLocaleString('es-CO')}`,
                variant: 'destructive',
              });
              return;
            }
          }
        }
      }
    }

    if (transactionToEdit) {
      // Update Mode
      if (onUpdateTransaction) {
        await onUpdateTransaction(transactionToEdit.id, transactionData);
        toast({ title: 'Actualizado', description: 'Transacción corregida correctamente.' });
        setOpen(false);
      }
      return;
    }

    // Add Mode
    if (onAdd) {
      const result = await onAdd(transactionData);
      const error = result && (result as any).error;

      if (error) {
        toast({
          title: 'Error al agregar transacción',
          description: typeof error === 'string' ? error : (error.message || 'Ocurrió un error inesperado.'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Éxito',
          description: 'Transacción agregada correctamente.',
        });
        reset({
          type: 'expense',
          category: availableCategories[0]?.label || '',
          category_id: availableCategories[0]?.value || '',
          amount: 0,
          description: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          payment_method_id: '',
          to_payment_method_id: '',
        });
        setOpen(false);
      }
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (val: number) => void) => {
    const rawValue = e.target.value;
    const cleanValue = rawValue.replace(/\./g, '').replace(/,/g, '.');
    const parsedValue = parseFloat(cleanValue);
    onChange(isNaN(parsedValue) ? 0 : parsedValue);
  };

  const formatDisplayedAmount = (value: number) => {
    if (value === 0) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <>
      {/* Alert Dialog for validation */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configuración requerida</AlertDialogTitle>
            <AlertDialogDescription>
              Antes de registrar, ¿quisieras agregar las categorías y métodos de pago?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
            <AlertDialogAction onClick={handleNavigateToSettings}>
              Configurar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Transaction Dialog */}
      {/* Trigger Button only if uncontrolled */}
      {!isControlled && (
        <Button
          onClick={validateBeforeOpen}
          className="gap-2 border border-primary min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center"
          aria-label="Nueva transacción"
          title="Nueva transacción"
        >
          <span className="hidden sm:flex flex-row items-center gap-2">Nueva transacción <Plus className="h-3 w-3" /></span>
          <span className="sm:hidden flex flex-row items-center gap-2">Nueva transacción <Plus className="h-3 w-3" /></span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{transactionToEdit ? 'Corregir Transacción' : 'Nueva transacción'}</DialogTitle>
            <DialogDescription className="sr-only">
              Completa el formulario para registrar o corregir una transacción.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 mt-4">
              <FormField
                control={control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Tipo</FormLabel>
                    <div className="grid grid-cols-12 gap-2">
                      {typeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'px-2 py-2 text-xs sm:text-sm rounded-lg border transition-all',
                            option.value === 'transfer_in' ? 'col-span-8' : 'col-span-4',
                            field.value === option.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted border-border'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentType !== 'transfer_in' && currentType !== 'transfer_out' && (
                  <FormField
                    control={control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            // Sync the category name for legacy support
                            const cat = availableCategories.find(c => c.value === val);
                            if (cat) setValue('category', cat.label);
                          }}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 md:h-9">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCategories.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                            <div className="border-t border-border/50 px-2 py-2 mt-1">
                              <AddCategoryDialog
                                type={currentType}
                                onAdd={addCategory}
                                onSuccess={(cat) => {
                                  setValue('category_id', cat.id);
                                  setValue('category', cat.name);
                                }}
                              />
                            </div>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Fecha</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="default"
                            className={cn(
                              'w-full justify-start text-left font-normal h-11 md:h-9',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(new Date(field.value), 'PP', { locale: es }) : 'Seleccionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={new Date(field.value)}
                            onSelect={(d) => d && field.onChange(format(d, 'yyyy-MM-dd'))}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={cn("grid gap-4", currentType === 'transfer_in' ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <FormField
                  control={control}
                  name="payment_method_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>{currentType === 'transfer_in' ? 'Desde (Origen)' : 'Método de pago'}</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 md:h-9">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin método</SelectItem>
                          {paymentMethods.map((pm) => {
                            const isCredit = pm.type === 'credit';
                            const available = isCredit ? (pm.credit_limit || 0) - pm.balance : pm.balance;
                            return (
                              <SelectItem key={pm.id} value={pm.id}>
                                {pm.name}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {isCredit ? '' : ''}
                                  (${Number(available).toLocaleString()})
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo de Cuotas (Solo si es Tarjeta de Crédito) */}
                {(() => {
                  const selectedPM = paymentMethods.find(pm => pm.id === form.watch('payment_method_id'));
                  if (selectedPM && selectedPM.type === 'credit' && currentType === 'expense') {
                    return (
                      <FormField
                        control={control}
                        name="installments"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel>Cuotas</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={field.value?.toString() || "1"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 md:h-9">
                                  <SelectValue placeholder="1" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1, 2, 3, 6, 10, 12, 18, 24, 36].map((n) => (
                                  <SelectItem key={n} value={n.toString()}>
                                    {n} {n === 1 ? 'cuota' : 'cuotas'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  }
                  return null;
                })()}

                {currentType === 'transfer_in' && (
                  <FormField
                    control={control}
                    name="to_payment_method_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Hacia (Destino)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === 'none' ? null : val)}
                          value={field.value || 'none'}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 md:h-9">
                              <SelectValue placeholder="Destino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar destino</SelectItem>
                            {paymentMethods.map((pm) => {
                              const isCredit = pm.type === 'credit';
                              const available = isCredit ? (pm.credit_limit || 0) - pm.balance : pm.balance;
                              return (
                                <SelectItem key={pm.id} value={pm.id}>
                                  {pm.name}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {isCredit ? '' : ''}
                                    (${Number(available).toLocaleString()})
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="amount">Monto</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
                        <Input
                          id="amount"
                          className={`${getCurrencyPadding()} h-11 md:h-9`}
                          placeholder={`${getPlaceholderAmount()}`}
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

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="description">Descripción</FormLabel>
                    <FormControl>
                      <Input
                        id="description"
                        className="h-11 md:h-9"
                        placeholder="Ej: Supermercado"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 md:h-9" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : (transactionToEdit ? 'Guardar Cambios' : 'Agregar transacción')}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog >
    </>
  );
}

export default AddTransactionDialog;
