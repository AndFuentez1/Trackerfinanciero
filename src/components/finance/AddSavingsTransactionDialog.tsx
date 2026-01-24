import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTodayLocalDate } from '@/lib/dateUtils';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
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
import { Coins } from 'lucide-react';
import { SavingsAccount, SavingsTransaction } from '@/hooks/useSavingsData';

interface AddSavingsTransactionDialogProps {
  accounts: SavingsAccount[];
  onAdd: (transaction: Omit<SavingsTransaction, 'id'>) => Promise<{ error: any }>;
}

export function AddSavingsTransactionDialog({ accounts, onAdd }: AddSavingsTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal' | 'interest'>('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayLocalDate());
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const getPlaceholderAmount = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `1000${decimals}` : '1000';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    
    setIsSubmitting(true);

    const { error } = await onAdd({
      payment_method_id: accountId,
      type,
      amount: parseFloat(amount),
      date,
      description: description.trim() || '',
    });

    setIsSubmitting(false);
    if (!error) {
      setAccountId('');
      setType('deposit');
      setAmount('');
      setDate(getTodayLocalDate());
      setDescription('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-2 min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center">
          <span className="hidden sm:flex flex-row items-center gap-2">Nuevo Movimiento <Coins className="h-3 w-3" /></span>
          <span className="sm:hidden flex flex-row items-center gap-2">Nuevo Movimiento <Coins className="h-3 w-3" /></span>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription className="sr-only">Registra un depósito, retiro o interés en una cuenta de ahorro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cuenta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit">Depósito</SelectItem>
                <SelectItem value="withdrawal">Retiro</SelectItem>
                <SelectItem value="interest">Interés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">{getCurrencySymbol()}</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={getPlaceholderAmount()}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={getCurrencyPadding()}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Ej: Ahorro mensual"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !accountId}>
            {isSubmitting ? 'Guardando...' : 'Agregar movimiento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}