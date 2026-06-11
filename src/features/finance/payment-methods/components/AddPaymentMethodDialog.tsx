import { useState, useEffect } from 'react';
import type { PaymentMethod, PaymentMethodType } from '@/features/finance/hooks/useFinanceData';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Check, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/core/utils';

interface AddPaymentMethodDialogProps {
  onAdd: (pm: Omit<PaymentMethod, 'id'>) => Promise<{ error: unknown; data?: PaymentMethod }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialName?: string;
  onSuccess?: (pm: PaymentMethod) => void;
  trigger?: React.ReactNode;
}

const typeOptions: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'savings', label: 'Ahorro' },
];

// Professional color palette for payment methods
const PRESET_COLORS = [
  { value: '#64748b', label: 'Pizarra' },
  { value: '#0d9488', label: 'Verde azulado' },
  { value: '#4f46e5', label: 'Índigo' },
  { value: '#e11d48', label: 'Rosa fuerte' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#10b98a', label: 'Esmeralda' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ec4899', label: 'Rosa' },
];

export function AddPaymentMethodDialog({ onAdd, open: controlledOpen, onOpenChange, initialName = '', onSuccess, trigger }: AddPaymentMethodDialogProps) {
  const { currency, decimalPlaces } = useFinance();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };



  const getPlaceholderBalance = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `1000000${decimals}` : '1000000';
  };

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<PaymentMethodType | 'savings'>('debit');
  const [balance, setBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [estimatedYield, setEstimatedYield] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [initialDate, setInitialDate] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'create' | 'merge'>('create');
  const [duplicateId, setDuplicateId] = useState('');
  const [primaryId, setPrimaryId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const { paymentMethods, mergePaymentMethods } = useFinanceData();
  const { toast } = useToast();

  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateId || !primaryId) {
      toast({ title: 'Error', description: 'Por favor selecciona ambas cuentas.', variant: 'destructive' });
      return;
    }
    if (duplicateId === primaryId) {
      toast({ title: 'Error', description: 'La cuenta duplicada y la cuenta principal deben ser diferentes.', variant: 'destructive' });
      return;
    }

    if (confirm('¿Estás seguro de que deseas fusionar estas cuentas? Esta acción reasignará todas las transacciones, consolidará los saldos y eliminará la cuenta duplicada de forma permanente.')) {
      setIsMerging(true);
      const result = await mergePaymentMethods.mutateAsync({ duplicateId, primaryId });
      setIsMerging(false);
      setDuplicateId('');
      setPrimaryId('');
      setOpen(false);
    }
  };

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { return; }

    setIsSubmitting(true);
    const result = await onAdd({
      name,
      type,
      balance: balance,
      credit_limit: type === 'credit' ? creditLimit : null,
      is_savings_account: type === 'savings',
      savings_goal: type === 'savings' && savingsGoal > 0 ? savingsGoal : null,
      estimated_yield: type === 'savings' && estimatedYield ? parseFloat(estimatedYield) : null,
      closing_date: type === 'credit' && closingDate ? parseInt(closingDate) : null,
      color,
      initial_date: `${initialDate}-01`, // Save as first day of month
    });

    setIsSubmitting(false);

    if (!result.error && result.data) {
      onSuccess?.(result.data);
      // Reset form
      setName('');
      setType('debit');
      setBalance(0);
      setCreditLimit(0);
      setSavingsGoal(0);
      setEstimatedYield('');
      setClosingDate('');
      setColor('#4f46e5');
      setInitialDate(new Date().toISOString().substring(0, 7));
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {trigger !== undefined ? (
        trigger
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs font-medium border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
            Nuevo método de pago
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {activeTab === 'create' ? 'Nuevo método de pago' : 'Fusionar cuentas duplicadas'}
          </DialogTitle>
          <DialogDescription className="sr-only">Crea un método de pago o fusiona cuentas duplicadas.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'create' | 'merge')} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="create">Crear Cuenta</TabsTrigger>
            <TabsTrigger value="merge">Fusionar Cuentas</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Ej: Banco XYZ, Efectivo casa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11 md:h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setType(option.value);
                      }}
                      className={cn(
                        'px-2 sm:px-3 py-2 text-xs sm:text-sm rounded-lg border transition-all whitespace-nowrap',
                        type === option.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-muted border-border'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm px-1">Color de Tarjeta</Label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 px-1">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={cn(
                        "w-full h-20 rounded-[4px] transition-all relative flex flex-col items-center justify-between p-2 bg-secondary hover:bg-secondary/80",
                        color === preset.value
                          ? "ring-2 ring-primary ring-offset-0 scale-105 shadow-sm"
                          : "border border-transparent"
                      )}
                      title={preset.label}
                    >
                      <div
                        className={cn(
                          "flex-1 w-full rounded-[4px] shadow-sm transition-transform",
                          color === preset.value ? "scale-95" : ""
                        )}
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className={cn(
                        "text-[9px] font-medium mt-1.5 uppercase leading-tight w-full text-center px-0.5 min-h-[1.8rem] flex items-center justify-center",
                        color === preset.value ? "text-primary" : "text-muted-foreground"
                      )}>
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {type === 'credit' ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="debt">Deuda actual</Label>
                      <MoneyInput
                        id="debt"
                        placeholder={getPlaceholderBalance()}
                        value={balance}
                        onChange={setBalance}
                        className="pl-12 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="limit">Límite de crédito</Label>
                      <MoneyInput
                        id="limit"
                        placeholder={getPlaceholderBalance()}
                        value={creditLimit}
                        onChange={setCreditLimit}
                        className="pl-12 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closing-date">Día de corte (1-31)</Label>
                    <Input
                      id="closing-date"
                      type="number"
                      placeholder="Ej: 15"
                      value={closingDate}
                      onChange={(e) => setClosingDate(e.target.value)}
                      min="1"
                      max="31"
                      required
                      className="h-11 md:h-9 text-sm"
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="balance" className="text-sm">Saldo actual</Label>
                  <MoneyInput
                    id="balance"
                    placeholder={getPlaceholderBalance()}
                    value={balance}
                    onChange={setBalance}
                    className="pl-12 text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="initial-date" className="text-sm">Fecha de inicio del saldo (mes/año)</Label>
                <Input
                  id="initial-date"
                  type="month"
                  value={initialDate}
                  onChange={(e) => setInitialDate(e.target.value)}
                  required
                  className="h-11 md:h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Define desde cuándo este saldo debe considerarse en el flujo histórico.
                </p>
              </div>

              {type === 'savings' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="goal" className="text-sm">Meta de ahorro ({getCurrencySymbol()})</Label>
                    <MoneyInput
                      id="goal"
                      placeholder={`Ej: ${getPlaceholderBalance()}`}
                      value={savingsGoal}
                      onChange={setSavingsGoal}
                      className="pl-12 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yield" className="text-sm">Rentabilidad Estimada (%)</Label>
                    <Input
                      id="yield"
                      type="number"
                      placeholder={decimalPlaces > 0 ? 'Ej: 3.50' : 'Ej: 3'}
                      value={estimatedYield}
                      onChange={(e) => setEstimatedYield(e.target.value)}
                      min="0"
                      step="0.01"
                      className="h-11 md:h-9 text-sm"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 md:h-9 text-sm sm:text-base font-semibold" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear método de pago'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="merge">
            <form onSubmit={handleMergeSubmit} className="space-y-4">
              <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive-foreground p-3">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <AlertDescription className="text-xs ml-2 text-foreground/80 leading-normal">
                  Esta acción fusionará dos cuentas reales en una sola. Reasignará todas las transacciones históricas, préstamos y saldos de la <strong>cuenta duplicada</strong> a la <strong>cuenta principal</strong>, y luego eliminará la duplicada de manera definitiva.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="duplicate-select" className="text-sm font-semibold">Cuenta duplicada (se eliminará)</Label>
                <Select value={duplicateId} onValueChange={setDuplicateId}>
                  <SelectTrigger className="h-11 md:h-9 text-sm bg-background">
                    <SelectValue placeholder="Selecciona la cuenta duplicada" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id} disabled={pm.id === primaryId}>
                        {pm.name} ({getCurrencySymbol()}{Number(pm.balance).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-select" className="text-sm font-semibold">Cuenta principal (conservará todo)</Label>
                <Select value={primaryId} onValueChange={setPrimaryId}>
                  <SelectTrigger className="h-11 md:h-9 text-sm bg-background">
                    <SelectValue placeholder="Selecciona la cuenta principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id} disabled={pm.id === duplicateId}>
                        {pm.name} ({getCurrencySymbol()}{Number(pm.balance).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full h-11 md:h-9 text-sm sm:text-base font-semibold" disabled={isMerging || !duplicateId || !primaryId}>
                {isMerging ? 'Fusionando...' : 'Fusionar cuentas ahora'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}





