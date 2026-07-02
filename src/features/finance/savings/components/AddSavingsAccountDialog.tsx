import { useState } from 'react';
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
import { Plus, Wallet } from 'lucide-react';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { useToast } from '@/shared/hooks/use-toast';
import type { YieldPeriod } from '@/features/finance/utils/yieldUtils';

interface AddSavingsAccountDialogProps {
  onAdd: (account: {
    name: string;
    balance?: number;
    savings_goal?: number;
    estimated_yield?: number;
    yield_period?: YieldPeriod;
  }) => Promise<{ error: unknown }>;
}

export function AddSavingsAccountDialog({ onAdd }: AddSavingsAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [estimatedYield, setEstimatedYield] = useState('');
  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>('annual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currency, decimalPlaces } = useFinance();
  const { toast } = useToast();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };

  const getPlaceholderAmount = () => {
    const decimals = '.'.padEnd(decimalPlaces + 1, '0');
    return decimalPlaces > 0 ? `100000${decimals}` : '100000';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await onAdd({
      name: name.trim(),
      balance: balance,
      savings_goal: savingsGoal > 0 ? savingsGoal : undefined,
      estimated_yield: estimatedYield ? parseFloat(estimatedYield) : undefined,
      yield_period: yieldPeriod,
    });

    setIsSubmitting(false);
    if (!error) {
      setName('');
      setBalance(0);
      setSavingsGoal(0);
      setEstimatedYield('');
      setYieldPeriod('annual');
      setOpen(false);
    } else {
      const err = error as { code?: string; message?: string };
      if (err?.code === '23505' || err?.message?.includes('unique_payment_method_user')) {
        toast({
          title: 'Nombre duplicado',
          description: 'Ya existe una cuenta con ese nombre. Por favor usa un nombre diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al crear cuenta',
          description: err?.message || 'No se pudo crear la cuenta de ahorro',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="inline-flex w-auto min-w-[190px] gap-2 px-4 py-2 items-center justify-center whitespace-nowrap hover:bg-primary/70 hover:text-white">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva cuenta</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nueva cuenta de ahorro</DialogTitle>
          <DialogDescription className="sr-only">Crea una cuenta de ahorro para registrar depósitos y retiros.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej: Fondo de emergencia"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo inicial</Label>
            <MoneyInput
              id="balance"
              placeholder={getPlaceholderAmount()}
              value={balance}
              onChange={setBalance}
              className="pl-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Meta de ahorro</Label>
            <MoneyInput
              id="goal"
              placeholder={getPlaceholderAmount()}
              value={savingsGoal}
              onChange={setSavingsGoal}
              className="pl-12"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="interest">Rentabilidad estimada (%)</Label>
              <Input
                id="interest"
                type="number"
                step="0.01"
                min="0"
                placeholder="3,00"
                value={estimatedYield}
                onChange={(e) => setEstimatedYield(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield-period">Periodo de la tasa</Label>
              <Select value={yieldPeriod} onValueChange={(v) => setYieldPeriod(v as YieldPeriod)}>
                <SelectTrigger id="yield-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Anual (EA)</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
