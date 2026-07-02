import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Label } from '@/shared/ui/label';
import { getTodayLocalDate } from '@/core/utils';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { cn } from '@/core/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Coins } from 'lucide-react';
import type { SavingsAccount, SavingsTransaction } from '@/features/finance/hooks/useSavingsData';

interface AddSavingsTransactionDialogProps {
  accounts: SavingsAccount[];
  onAdd: (transaction: Omit<SavingsTransaction, 'id'>) => Promise<{ error: any }>;
}

export function AddSavingsTransactionDialog({ accounts, onAdd }: AddSavingsTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal' | 'interest'>('deposit');
  const [interestMode, setInterestMode] = useState<'new_balance' | 'difference'>('new_balance');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(getTodayLocalDate());
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currency, decimalPlaces } = useFinance();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };



  const getPlaceholderAmount = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `1000${decimals}` : '1000';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) { return; }

    setIsSubmitting(true);

    let finalAmount = amount;
    if (type === 'interest' && interestMode === 'new_balance') {
       const account = accounts.find(a => a.id === accountId);
       const currentBalance = account?.balance || 0;
       finalAmount = amount - currentBalance;
    }

    const { error } = await onAdd({
      payment_method_id: accountId,
      savings_account_id: accountId,
      type,
      amount: finalAmount,
      date,
      description: description.trim() || '',
    });

    setIsSubmitting(false);
    if (!error) {
      setAccountId('');
      setType('deposit');
      setAmount(0);
      setDate(getTodayLocalDate());
      setDescription('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="inline-flex w-auto min-w-[190px] gap-2 px-4 py-2 items-center justify-center whitespace-nowrap hover:bg-primary/70 hover:text-white"
        >
          <Coins className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo ahorro</span>
          <span className="sm:hidden">Nuevo ahorro</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo ahorro</DialogTitle>
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
          {type === 'interest' && (
            <div className="flex items-center gap-2 mt-2">
               <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 w-full">
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   className={cn("flex-1 h-7 text-xs rounded-md", interestMode === 'new_balance' ? "bg-background shadow-sm" : "hover:bg-background/50")}
                   onClick={() => setInterestMode('new_balance')}
                 >
                   Nuevo Saldo Total
                 </Button>
                 <Button
                   type="button"
                   variant="ghost"
                   size="sm"
                   className={cn("flex-1 h-7 text-xs rounded-md", interestMode === 'difference' ? "bg-background shadow-sm" : "hover:bg-background/50")}
                   onClick={() => setInterestMode('difference')}
                 >
                   Diferencia
                 </Button>
               </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">
              {type === 'interest' && interestMode === 'new_balance' ? 'Monto (Nuevo Saldo)' : 'Monto'}
            </Label>
            <MoneyInput
              id="amount"
              placeholder={getPlaceholderAmount()}
              value={amount}
              onChange={setAmount}
              className="pl-12"
            />
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





