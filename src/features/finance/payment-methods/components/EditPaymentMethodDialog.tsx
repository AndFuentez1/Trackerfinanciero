import { useState, useEffect } from 'react';
import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { MoneyInput } from '@/shared/components/MoneyInput';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useToast } from '@/shared/hooks/use-toast';

const PAYMENT_METHOD_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'debit', label: 'Débito' },
  { value: 'credit', label: 'Crédito' },
  { value: 'savings', label: 'Ahorro/Inversión' },
];

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b98a', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

interface EditPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: PaymentMethod | null;
  onSave?: (id: string, updates: Partial<Omit<PaymentMethod, 'id'>>) => Promise<unknown>;
  lockType?: boolean;
}

export function EditPaymentMethodDialog({
  open,
  onOpenChange,
  paymentMethod,
  onSave,
  lockType = false,
}: EditPaymentMethodDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'debit' as PaymentMethod['type'],
    balance: 0,
    creditLimit: 0,
    closingDate: '',
    paymentDay: '',
    color: '#3b82f6',
    isSavingsAccount: false,
    savingsGoal: 0,
    estimatedYield: '',
  });

  // Update form data when paymentMethod changes
  useEffect(() => {
    if (paymentMethod) {
      setFormData({
        name: paymentMethod.name,
        type: paymentMethod.type,
        balance: Number(paymentMethod.balance),
        creditLimit: Number(paymentMethod.credit_limit || 0),
        closingDate: paymentMethod.closing_date?.toString() || '',
        paymentDay: paymentMethod.payment_day?.toString() || '',
        color: paymentMethod.color || '#3b82f6',
        isSavingsAccount: paymentMethod.is_savings_account || false,
        savingsGoal: Number(paymentMethod.savings_goal || 0),
        estimatedYield: paymentMethod.estimated_yield?.toString() || '',
      });
    }
  }, [paymentMethod]);

  // Don't render if paymentMethod is null
  if (!paymentMethod) {
    return null;
  }

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!formData.name.trim()) {
        toast({
          title: 'Error',
          description: 'El nombre es requerido',
          variant: 'destructive',
        });
        return;
      }

      // Show warning about configuration change
      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios se aplicarán al método de pago. Las transacciones existentes no se verán afectadas.',
      });

      const updates: Partial<Omit<PaymentMethod, 'id'>> = {
        name: formData.name,
        type: formData.type as PaymentMethod['type'],
        balance: Number(formData.balance) || 0,
        color: formData.color,
      };

      if (formData.type === 'credit') {
        updates.is_savings_account = false;
        if (formData.creditLimit) {
          updates.credit_limit = Number(formData.creditLimit);
        }
        if (formData.closingDate) {
          updates.closing_date = parseInt(formData.closingDate);
        }
        if (formData.paymentDay) {
          updates.payment_day = parseInt(formData.paymentDay);
        }
      } else if (formData.type === 'savings') {
        updates.is_savings_account = true;
        if (formData.savingsGoal) {
          updates.savings_goal = Number(formData.savingsGoal);
        }
        if (formData.estimatedYield) {
          updates.estimated_yield = parseFloat(formData.estimatedYield);
        }
      } else {
        // For debit, cash, or any other type
        updates.is_savings_account = false;
      }

      if (onSave) {
        await onSave(paymentMethod.id, updates);
      }
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar método de pago</DialogTitle>
          <DialogDescription>
            Actualiza los detalles de tu método de pago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ej: Mi tarjeta de crédito"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value as PaymentMethod['type'] })
              }
              disabled={lockType}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockType && (
              <p className="text-xs text-muted-foreground">El tipo no se puede cambiar al editar desde cuentas de ahorro</p>
            )}
          </div>

          {/* Balance/Debt */}
          <div className="space-y-2">
            <Label htmlFor="balance">{formData.type === 'credit' ? 'Deuda actual' : 'Saldo'}</Label>
            <MoneyInput
              id="balance"
              value={formData.balance}
              onChange={(val) =>
                setFormData({ ...formData, balance: val })
              }
              placeholder="0.00"
            />
          </div>

          {/* Credit Limit (for credit cards) */}
          {formData.type === 'credit' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Límite de crédito</Label>
                <MoneyInput
                  id="creditLimit"
                  value={formData.creditLimit}
                  onChange={(val) =>
                    setFormData({ ...formData, creditLimit: val })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Closing/Payment Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closingDate">Día de corte</Label>
                  <Input
                    id="closingDate"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.closingDate}
                    onChange={(e) =>
                      setFormData({ ...formData, closingDate: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay">Día de pago</Label>
                  <Input
                    id="paymentDay"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.paymentDay}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDay: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>
              </div>
            </>
          )}

          {/* Savings Goal and Estimated Yield (for savings accounts) */}
          {formData.type === 'savings' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="savingsGoal">Meta de ahorro</Label>
                <MoneyInput
                  id="savingsGoal"
                  value={formData.savingsGoal}
                  onChange={(val) =>
                    setFormData({ ...formData, savingsGoal: val })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedYield">Rentabilidad estimada (%)</Label>
                <Input
                  id="estimatedYield"
                  type="number"
                  step="0.01"
                  value={formData.estimatedYield}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedYield: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </>
          )}

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.color === color
                    ? 'border-foreground'
                    : 'border-transparent'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="default"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



