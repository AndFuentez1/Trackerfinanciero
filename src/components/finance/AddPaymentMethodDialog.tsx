import { useState } from 'react';
import { PaymentMethod, PaymentMethodType } from '@/hooks/useFinanceData';
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
import { CreditCard, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddPaymentMethodDialogProps {
  onAdd: (pm: Omit<PaymentMethod, 'id'>) => Promise<{ error: unknown }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const typeOptions: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'savings', label: 'Cuenta de Ahorro / Inversión' },
];

// Professional color palette for payment methods
const PRESET_COLORS = [
  { value: '#64748b', label: 'Slate' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ec4899', label: 'Pink' },
];

export function AddPaymentMethodDialog({ onAdd, open: controlledOpen, onOpenChange }: AddPaymentMethodDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType | 'savings'>('debit');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [isSavingsAccount, setIsSavingsAccount] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState('');
  const [estimatedYield, setEstimatedYield] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [color, setColor] = useState('#4f46e5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    const { error } = await onAdd({
      name,
      type,
      balance: parseFloat(balance || '0'),
      credit_limit: type === 'credit' ? parseFloat(creditLimit || '0') : null,
      is_savings_account: isSavingsAccount,
      savings_goal: isSavingsAccount && savingsGoal ? parseFloat(savingsGoal) : null,
      estimated_yield: isSavingsAccount && estimatedYield ? parseFloat(estimatedYield) : null,
      closing_date: type === 'credit' && closingDate ? parseInt(closingDate) : null,
      color,
    });

    setIsSubmitting(false);

    if (!error) {
      setName('');
      setType('debit');
      setBalance('');
      setCreditLimit('');
      setIsSavingsAccount(false);
      setSavingsGoal('');
      setEstimatedYield('');
      setClosingDate('');
      setColor('#4f46e5');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo método de pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej: Banco XYZ, Efectivo casa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setType(option.value);
                    setIsSavingsAccount(option.value === 'savings');
                  }}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg border transition-all',
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
            <Label>Color de Tarjeta</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className="relative group"
                  title={preset.label}
                >
                  <div
                    className="w-full h-10 rounded-lg border-2 transition-all shadow-sm hover:shadow-md"
                    style={{
                      backgroundColor: preset.value,
                      borderColor: color === preset.value ? '#fff' : 'transparent',
                      borderWidth: color === preset.value ? '2px' : '1px',
                    }}
                  >
                    {color === preset.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground text-center block mt-1 group-hover:text-foreground">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {type === 'credit' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="debt">Deuda actual</Label>
                <Input
                  id="debt"
                  type="number"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Límite de crédito</Label>
                <Input
                  id="limit"
                  type="number"
                  placeholder="0.00"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
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
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="balance">Saldo actual</Label>
              <Input
                id="balance"
                type="number"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                step="0.01"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
            <div className="space-y-0.5">
              <Label htmlFor="is-savings" className="text-sm font-medium">Cuenta de ahorro / Inversión</Label>
              <p className="text-xs text-muted-foreground">Se mostrará en el panel de ahorros con barra de progreso.</p>
            </div>
            <input
              id="is-savings"
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              checked={isSavingsAccount}
              onChange={(e) => setIsSavingsAccount(e.target.checked)}
            />
          </div>

          {(type === 'savings' || isSavingsAccount) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-2">
                <Label htmlFor="goal">Meta de ahorro ($)</Label>
                <Input
                  id="goal"
                  type="number"
                  placeholder="Ej: 5000000"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yield">Rentabilidad Estimada (%)</Label>
                <Input
                  id="yield"
                  type="number"
                  placeholder="Ej: 3.5"
                  value={estimatedYield}
                  onChange={(e) => setEstimatedYield(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear método de pago'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
