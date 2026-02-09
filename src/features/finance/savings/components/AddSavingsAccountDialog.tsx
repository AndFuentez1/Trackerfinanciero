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
import { Plus, Wallet } from 'lucide-react';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { useToast } from '@/shared/hooks/use-toast';

interface AddSavingsAccountDialogProps {
  onAdd: (account: { name: string; balance?: number; savings_goal?: number; estimated_yield?: number }) => Promise<{ error: any }>;
}

export function AddSavingsAccountDialog({ onAdd }: AddSavingsAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [savingsGoal, setSavingsGoal] = useState<number>(0);
  const [estimatedYield, setEstimatedYield] = useState('');
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

  const getPlaceholderYield = () => {
    if (decimalPlaces <= 0) return '3';
    return `3.${'0'.repeat(decimalPlaces)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await onAdd({
      name: name.trim(),
      balance: balance,
      savings_goal: savingsGoal > 0 ? savingsGoal : undefined,
      estimated_yield: estimatedYield ? parseFloat(estimatedYield) : undefined,
    });

    setIsSubmitting(false);
    if (!error) {
      setName('');
      setBalance(0);
      setSavingsGoal(0);
      setEstimatedYield('');
      setOpen(false);
    } else {
      // Check if it's a duplicate name error
      if (error?.code === '23505' || error?.message?.includes('unique_payment_method_user')) {
        toast({
          title: 'Nombre duplicado',
          description: 'Ya existe una cuenta con ese nombre. Por favor usa un nombre diferente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al crear cuenta',
          description: error?.message || 'No se pudo crear la cuenta de ahorro',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2 min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center">
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
          <div className="space-y-2">
            <Label htmlFor="interest">Rentabilidad estimada (%)</Label>
            <Input
              id="interest"
              type="number"
              step="0.01"
              min="0"
              placeholder={getPlaceholderYield()}
              value={estimatedYield}
              onChange={(e) => setEstimatedYield(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}





