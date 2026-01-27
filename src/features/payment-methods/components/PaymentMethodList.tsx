import { PaymentMethod } from '@/hooks/useFinanceData';
import { Plus, CreditCard, PiggyBank, Banknote, Edit2, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  variant?: 'dashboard' | 'settings';
  onEdit?: (pm: PaymentMethod) => void;
  onDelete?: (pm: PaymentMethod) => void;
  onAdd?: () => void;
  highlighted?: boolean;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'credit': return <CreditCard className="h-4 w-4" />;
    case 'savings': return <PiggyBank className="h-4 w-4" />;
    case 'investment': return <PiggyBank className="h-4 w-4" />;
    default: return <Banknote className="h-4 w-4" />;
  }
};

const typeLabels: Record<string, string> = {
  debit: 'Débito',
  credit: 'Tarjeta de Crédito',
  savings: 'Ahorros',
  investment: 'Inversión',
  cash: 'Efectivo'
};

const HeaderShape = ({ color, type }: { color: string, type: string }) => {
  // Deterministic shape based on color string length or first char code
  const seed = color.length + (type?.length || 0);
  const opacity = 0.08; // Very subtle

  if (seed % 4 === 0) {
    // Large Circle
    return (
      <div
        className="absolute -right-8 -bottom-16 w-56 h-56 rounded-full pointer-events-none"
        style={{ backgroundColor: color, opacity }}
      />
    );
  } else if (seed % 4 === 1) {
    // Square rotated
    return (
      <div
        className="absolute -right-10 -bottom-20 w-64 h-64 pointer-events-none transform rotate-12"
        style={{ backgroundColor: color, borderRadius: '20%', opacity }}
      />
    );
  } else if (seed % 4 === 2) {
    // Triangle (Clip path)
    return (
      <div
        className="absolute -right-6 -bottom-6 w-64 h-64 pointer-events-none"
        style={{
          backgroundColor: color,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          transform: 'rotate(-45deg)',
          opacity
        }}
      />
    );
  }

  // Hexagon
  return (
    <div
      className="absolute -right-12 -bottom-12 w-64 h-64 pointer-events-none"
      style={{
        backgroundColor: color,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        transform: 'rotate(15deg)',
        opacity
      }}
    />
  );
};


export function PaymentMethodList({ paymentMethods, variant = 'dashboard', onEdit, onDelete, onAdd, highlighted }: PaymentMethodListProps) {
  const { formatCurrency } = useFormatCurrency();
  const [deleteData, setDeleteData] = useState<PaymentMethod | null>(null);

  const confirmDelete = () => {
    if (deleteData && onDelete) {
      onDelete(deleteData);
      setDeleteData(null);
    }
  };


  return (
    <div className={cn(
      "grid gap-4",
      variant === 'dashboard' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "grid-cols-1 md:grid-cols-3"
    )}>
      {paymentMethods.map((pm) => {
        const color = pm.color || '#64748b';
        return (
          <div
            key={pm.id}
            className="group relative p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white flex flex-col justify-between min-h-[160px]"
            style={{ backgroundColor: `${color}10` }}
          >
            {/* Fondo y forma decorativa */}
            <div
              className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
            />
            <HeaderShape color={color} type={pm.type} />

            {/* Layout principal: grid/flexbox */}
            <div className="relative z-10 grid grid-cols-12 gap-2 items-center w-full">
              {/* Icono y color */}
              <div className="col-span-2 flex items-center justify-center">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md ring-2 ring-white/20 ring-offset-2 ring-offset-background"
                  style={{ backgroundColor: color }}
                >
                  {getIcon(pm.type)}
                </div>
              </div>
              {/* Nombre y tipo */}
              <div className="col-span-6 flex flex-col min-w-0">
                <span className="text-base font-bold text-foreground truncate max-w-[120px] sm:max-w-[150px]">{pm.name}</span>
                <div className="flex gap-2 items-center mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-none bg-background/50 backdrop-blur-sm font-bold tracking-wider uppercase w-fit">
                    {typeLabels[pm.type] || pm.type}
                  </Badge>
                  {pm.franchise && (typeLabels[pm.type] !== pm.franchise) && (
                    <span className="text-[9px] font-mono opacity-70 uppercase border border-foreground/20 rounded px-1">{pm.franchise}</span>
                  )}
                </div>
              </div>
              {/* Balance y detalles */}
              <div className="col-span-4 flex flex-col items-end">
                {pm.type === 'credit' && pm.credit_limit && (
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter bg-muted/50 px-2 py-0.5 rounded-full">
                    Límite: {formatCurrency(pm.credit_limit)}
                  </span>
                )}
                {pm.last_4_digits && (
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                    **** {pm.last_4_digits}
                  </span>
                )}
              </div>
            </div>

            {/* Saldo en esquina inferior izquierda */}
            <div className="absolute bottom-3 left-3 z-10">
              <span className="text-2xl font-mono font-bold tracking-tight text-foreground">{formatCurrency(pm.balance)}</span>
            </div>

            {/* Acciones (Editar/Borrar) */}
            {(onEdit || onDelete) && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-dashed border-border/60 relative z-10 mt-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(pm)}
                    className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteData(pm)}
                    className="h-9 w-9 rounded-xl text-destructive hover:bg-primary/10 hover:text-primary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Payment Method Card */}
      {onAdd && (
        <Button
          variant="default"
          onClick={onAdd}
          className={cn(
            "h-auto min-h-[180px] rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-primary hover:text-primary/90 font-semibold transition-all duration-500 text-base shadow-sm hover:shadow-md",
            highlighted && [
              "scale-[1.03] ring-4 ring-primary ring-offset-4 ring-offset-background",
              "shadow-[0_0_30px_0_hsl(var(--color-primary)/0.8)]",
              "bg-white text-primary border-primary font-bold z-10"
            ]
          )}
        >
          <Plus className={cn("h-7 w-7", highlighted && "animate-pulse")} />
          <span>Nueva Cuenta</span>
        </Button>
      )}


      <AlertDialog open={!!deleteData} onOpenChange={(open) => !open && setDeleteData(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{deleteData?.name}</strong>.
              Las transacciones asociadas a esta cuenta podrían quedar huérfanas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
