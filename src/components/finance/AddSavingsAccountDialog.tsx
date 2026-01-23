import { useState } from 'react';
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
import { Plus } from 'lucide-react';

interface AddSavingsAccountDialogProps {
  onAdd: (account: { name: string; balance?: number; savings_goal?: number; estimated_yield?: number }) => Promise<{ error: any }>;
}

export function AddSavingsAccountDialog({ onAdd }: AddSavingsAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [estimatedYield, setEstimatedYield] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await onAdd({
      name: name.trim(),
      balance: balance ? parseFloat(balance) : 0,
      savings_goal: savingsGoal ? parseFloat(savingsGoal) : undefined,
      estimated_yield: estimatedYield ? parseFloat(estimatedYield) : undefined,
    });

    setIsSubmitting(false);
    if (!error) {
      setName('');
      setBalance('');
      setSavingsGoal('');
      setEstimatedYield('');
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
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
            <Input
              id="balance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Meta de ahorro ($)</Label>
            <Input
              id="goal"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest">Rentabilidad estimada (%)</Label>
            <Input
              id="interest"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
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