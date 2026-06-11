import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';

interface DeleteAccountConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName?: string;
  accountId?: string;
  paymentMethods: any[];
  onConfirm: (option: 'delete' | 'orphan' | 'transfer', transferToId?: string) => void;
  isSavings?: boolean;
}

export function DeleteAccountConfirmDialog({
  open,
  onOpenChange,
  accountName = '',
  accountId = '',
  paymentMethods,
  onConfirm,
  isSavings = false,
}: DeleteAccountConfirmDialogProps) {
  const [option, setOption] = useState<'delete' | 'orphan' | 'transfer'>('orphan');
  const [transferToId, setTransferToId] = useState<string>('');

  // Reset options when dialog opens
  useEffect(() => {
    if (open) {
      setOption('orphan');
      setTransferToId('');
    }
  }, [open]);

  // Filter payment methods to exclude current account, and if it is savings, maybe allow transfer to other accounts?
  // User says: "Al eliminar una cuenta tambien debe estar la opción de pasar los gastos a otra cuenta, esto con el fin de borrar una cuenta y pasar los gastos asociados a otra."
  // So we allow transferring to any other active payment method.
  const eligibleMethods = paymentMethods.filter(pm => pm.id !== accountId);

  const handleConfirm = () => {
    if (option === 'transfer' && !transferToId) {
      return;
    }
    onConfirm(option, option === 'transfer' ? transferToId : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">¿Eliminar cuenta?</DialogTitle>
          <DialogDescription>
            Estás a punto de eliminar la cuenta <strong>{accountName}</strong>. Selecciona qué deseas hacer con sus transacciones y saldo asociado:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup
            value={option}
            onValueChange={(val) => setOption(val as 'delete' | 'orphan' | 'transfer')}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-3 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
              <RadioGroupItem value="delete" id="opt-delete" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="opt-delete" className="font-semibold text-sm cursor-pointer">
                  Eliminar todo
                </Label>
                <p className="text-xs text-muted-foreground leading-normal">
                  Elimina permanentemente esta cuenta y todas las transacciones históricas asociadas a ella.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-3 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
              <RadioGroupItem value="orphan" id="opt-orphan" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="opt-orphan" className="font-semibold text-sm cursor-pointer">
                  Mantener transacciones (Huérfanas)
                </Label>
                <p className="text-xs text-muted-foreground leading-normal">
                  Elimina la cuenta pero conserva todas sus transacciones, dejándolas sin cuenta asignada (saldo no afectado).
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-3 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
              <RadioGroupItem value="transfer" id="opt-transfer" className="mt-1" />
              <div className="space-y-1 w-full">
                <Label htmlFor="opt-transfer" className="font-semibold text-sm cursor-pointer">
                  Transferir transacciones y saldo
                </Label>
                <p className="text-xs text-muted-foreground leading-normal mb-2">
                  Transfiere todas las transacciones asociadas y suma su saldo actual a otra cuenta activa.
                </p>
                
                {option === 'transfer' && (
                  <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label htmlFor="transfer-select" className="text-xs font-bold text-muted-foreground">Cuenta destino</Label>
                    <Select value={transferToId} onValueChange={setTransferToId}>
                      <SelectTrigger id="transfer-select" className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Seleccionar cuenta destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleMethods.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            {pm.name} (${Number(pm.balance).toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {option === 'delete' && (
            <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-xs ml-2 font-medium">
                ¡Advertencia! Esto borrará permanentemente todos los gastos, ingresos y transferencias registradas con esta cuenta.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-semibold"
            disabled={option === 'transfer' && !transferToId}
          >
            Confirmar Eliminación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
