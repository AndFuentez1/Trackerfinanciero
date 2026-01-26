import { PaymentMethod } from '@/hooks/useFinanceData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  variant?: 'dashboard' | 'settings';
  onEdit?: (pm: PaymentMethod) => void;
  onDelete?: (pm: PaymentMethod) => void;
  onAdd?: () => void;
  highlighted?: boolean;
}

// Color scheme based on account type
const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#ffffff';
};

const getAccountType = (type: string, isSavings: boolean): string => {
  if (isSavings) return 'AHORRO';
  switch (type) {
    case 'debit':
      return 'DÉBITO';
    case 'credit':
      return 'CRÉDITO';
    case 'cash':
      return 'EFECTIVO';
    default:
      return 'DIGITAL';
  }
};

const getInitial = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

export function PaymentMethodList({ paymentMethods, variant = 'dashboard', onEdit, onDelete, onAdd, highlighted }: PaymentMethodListProps) {
  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall, currency } = useFormatCurrency();
  const { currency: ctxCurrency } = useFinance();

  const formatCurrencyPayment = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {paymentMethods.map((pm) => {
        const bgColor = pm.color || '#64748b';
        const textColor = getTextColor(bgColor);
        const accountType = getAccountType(pm.type, pm.is_savings_account || false);

        return (
          <div
            key={pm.id}
            className="relative h-48 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
            style={{ backgroundColor: bgColor }}
          >
            {/* Icono círculo sólido */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/30 flex items-center justify-center shadow-md">
              <span className="text-lg font-bold" style={{ color: textColor }}>{getInitial(pm.name)}</span>
            </div>

            {/* Top Level: Name (Left) + Account Type (Right) */}
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-base font-semibold" style={{ color: textColor }}>{pm.name}</p>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>{accountType}</span>
            </div>

            {/* Middle Level: Balance (Prominent, Centered) */}
            <div className="relative z-10 flex flex-col items-start">
              <p className="text-xs font-normal mb-2 opacity-90" style={{ color: textColor }}>
                {pm.type === 'credit' ? '' : 'Balance'}
              </p>
              <div className="text-3xl font-semibold" style={{ color: textColor }}>
                {pm.is_savings_account || pm.type === 'debit' || pm.type === 'cash'
                  ? formatCurrencyPayment(pm.balance)
                  : pm.type === 'credit'
                    ? formatCurrencyPayment(pm.credit_limit ? pm.credit_limit - pm.balance : pm.balance)
                    : formatCurrencyPayment(pm.balance)}
              </div>
            </div>

            {/* Bottom Level: Secondary Info + Action Icons */}
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-xs opacity-75" style={{ color: textColor }}>Principal</p>
              {(onEdit || onDelete) && (
                <div className="flex gap-2">
                  {onEdit && (
                    <button
                      title="Editar"
                      onClick={() => onEdit(pm)}
                      className="h-9 w-9 rounded-xl bg-white/80 hover:bg-blue-100 text-blue-600 shadow-none border-none flex items-center justify-center transition-all duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      title="Eliminar"
                      onClick={() => onDelete(pm)}
                      className="h-9 w-9 rounded-xl bg-white/80 hover:bg-red-100 text-red-600 shadow-none border-none flex items-center justify-center transition-all duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Add Payment Method Card */}
      <Button
        variant="default"
        onClick={onAdd}
        className={cn(
          "h-48 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 flex flex-col items-center justify-center gap-2 text-blue-600 font-semibold transition-all duration-500 text-base shadow-md",
          highlighted && [
            "scale-[1.08] ring-4 ring-primary ring-offset-4 ring-offset-background",
            "shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
            "bg-white text-primary border-primary font-bold z-10"
          ]
        )}
      >
        <Plus className={cn("h-7 w-7", highlighted && "animate-pulse")}/>
        <span>Agregar método</span>
      </Button>
    </div>
  );
}
