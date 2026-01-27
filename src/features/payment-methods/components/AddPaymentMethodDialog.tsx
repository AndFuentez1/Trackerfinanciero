import { useState, useEffect } from 'react';
import { PaymentMethod, PaymentMethodType } from '@/hooks/useFinanceData';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard } from 'lucide-react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const getCurrencyPadding = () => {
    const symbol = getCurrencySymbol();
    if (symbol.length > 2) return 'pl-16';
    if (symbol.length === 2) return 'pl-12';
    return 'pl-9';
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
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [estimatedYield, setEstimatedYield] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [franchise, setFranchise] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    const result = await onAdd({
      name,
      type,
      balance: parseFloat(balance || '0'),
      credit_limit: type === 'credit' ? parseFloat(creditLimit || '0') : null,
      is_savings_account: type === 'savings',
      savings_goal: type === 'savings' && savingsGoal ? parseFloat(savingsGoal) : null,
      estimated_yield: type === 'savings' && estimatedYield ? parseFloat(estimatedYield) : null,
      closing_date: type === 'credit' && closingDate ? parseInt(closingDate) : null,

      color,
      franchise: (type === 'credit' || type === 'debit') ? franchise : null,
      last_4_digits: null,
    });

    setIsSubmitting(false);

    if (!result.error && result.data) {
      onSuccess?.(result.data);
      // Reset form
      setName('');
      setType('debit');
      setBalance('');
      setCreditLimit('');
      setSavingsGoal('');
      setEstimatedYield('');
      setClosingDate('');

      setColor('#4f46e5');
      setFranchise('');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">Nuevo método de pago</DialogTitle>
          <DialogDescription className="sr-only">Crea un método de pago para registrar movimientos y saldos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-4">
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


          {(type === 'credit' || type === 'debit') && (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchise" className="text-sm">Franquicia</Label>
                <Select value={franchise} onValueChange={setFranchise}>
                  <SelectTrigger id="franchise" className="h-11 md:h-9 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">American Express</SelectItem>
                    <SelectItem value="diners">Diners Club</SelectItem>
                    <SelectItem value="other">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'credit' ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="debt">Deuda actual</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
                    <Input
                      id="debt"
                      type="number"
                      placeholder={getPlaceholderBalance()}
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      min="0"
                      step="0.01"
                      className={`${getCurrencyPadding()} h-11 md:h-9 text-sm`}
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Límite de crédito</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
                    <Input
                      id="limit"
                      type="number"
                      placeholder={getPlaceholderBalance()}
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      min="0"
                      step="0.01"
                      required
                      className={`${getCurrencyPadding()} h-11 md:h-9 text-sm`}
                      inputMode="decimal"
                    />
                  </div>
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
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
                <Input
                  id="balance"
                  type="number"
                  placeholder={getPlaceholderBalance()}
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  step="0.01"
                  className={`${getCurrencyPadding()} h-11 md:h-9 text-sm`}
                  inputMode="decimal"
                />
              </div>
            </div>
          )}

          {type === 'savings' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-sm">Meta de ahorro ({getCurrencySymbol()})</Label>
                <Input
                  id="goal"
                  type="number"
                  placeholder={`Ej: ${getPlaceholderBalance()}`}
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`${getCurrencyPadding()} h-11 md:h-9 text-sm`}
                  inputMode="decimal"
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

          <Button type="submit" className="w-full h-11 md:h-9 text-sm sm:text-base" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear método de pago'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
