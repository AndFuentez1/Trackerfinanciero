import { useEffect, useState } from 'react';
import { PaymentMethod, PaymentMethodType } from '@/hooks/useFinanceData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFinanceData } from '@/hooks/useFinanceData';

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

interface EditPaymentMethodDialogProps {
  paymentMethod: PaymentMethod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPaymentMethodDialog({ paymentMethod, open, onOpenChange }: EditPaymentMethodDialogProps) {
  const { updatePaymentMethod } = useFinanceData();
  const [form, setForm] = useState({
    name: '',
    type: 'debit' as PaymentMethodType,
    balance: 0,
    credit_limit: null as number | null,
    is_savings_account: false,
    savings_goal: null as number | null,
    estimated_yield: null as number | null,
    closing_date: null as number | null,
    payment_day: null as number | null,
    color: '#4f46e5',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (paymentMethod && open) {
      setForm({
        name: paymentMethod.name,
        type: paymentMethod.type,
        balance: paymentMethod.balance,
        credit_limit: paymentMethod.credit_limit || null,
        is_savings_account: paymentMethod.is_savings_account || false,
        savings_goal: paymentMethod.savings_goal || null,
        estimated_yield: paymentMethod.estimated_yield || null,
        closing_date: paymentMethod.closing_date || null,
        payment_day: paymentMethod.payment_day || null,
        color: paymentMethod.color || '#4f46e5',
      });
    }
  }, [paymentMethod, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) return;
    setSubmitting(true);
    await updatePaymentMethod(paymentMethod.id, form);
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar método de pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pm-name">Nombre</Label>
            <Input
              id="pm-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {form.type === 'credit' ? (
              <div className="space-y-2">
                <Label htmlFor="pm-limit">Límite de crédito</Label>
                <Input
                  id="pm-limit"
                  type="number"
                  value={form.credit_limit || 0}
                  onChange={(e) => setForm({ ...form, credit_limit: parseFloat(e.target.value) })}
                  step="0.01"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="pm-balance">Saldo actual</Label>
                <Input
                  id="pm-balance"
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) })}
                  step="0.01"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: preset.value })}
                    className="relative group"
                    title={preset.label}
                  >
                    <div
                      className="w-full h-10 rounded-lg border-2 transition-all shadow-sm hover:shadow-md"
                      style={{
                        backgroundColor: preset.value,
                        borderColor: form.color === preset.value ? '#fff' : 'transparent',
                        borderWidth: form.color === preset.value ? '2px' : '1px',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(form.is_savings_account || form.type === 'debit') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pm-goal">Meta de ahorro ($)</Label>
                <Input
                  id="pm-goal"
                  type="number"
                  value={form.savings_goal || ''}
                  onChange={(e) => setForm({ ...form, savings_goal: parseFloat(e.target.value) || null })}
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-yield">Rentabilidad Estimada (%)</Label>
                <Input
                  id="pm-yield"
                  type="number"
                  value={form.estimated_yield || 0}
                  onChange={(e) => setForm({ ...form, estimated_yield: parseFloat(e.target.value) })}
                  step="0.01"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
