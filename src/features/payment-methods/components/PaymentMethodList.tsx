import { PaymentMethod } from '@/hooks/useFinanceData';
import { Plus, CreditCard, Wallet, Banknote, PiggyBank, Landmark, Pencil, Trash2 } from 'lucide-react';
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

const getIconForType = (type: string) => {
  switch (type) {
    case 'credit': return <CreditCard className="w-5 h-5" />;
    case 'cash': return <Banknote className="w-5 h-5" />;
    case 'savings': return <PiggyBank className="w-5 h-5" />;
    case 'investment': return <Landmark className="w-5 h-5" />;
    default: return <Wallet className="w-5 h-5" />;
  }
};

export function PaymentMethodList({ paymentMethods, variant = 'dashboard', onEdit, onDelete, onAdd, highlighted }: PaymentMethodListProps) {
  const decimalPlaces = useDecimalPlaces();
  const { formatCurrencySmall, currency } = useFormatCurrency();
  const { currency: ctxCurrency } = useFinance();

  const formatCurrencyPayment = (value: number) => {
    const currCode = ctxCurrency || currency || 'COP';
    const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;

    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currCode,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      currencyDisplay: 'code',
    }).format(value).replace(currCode, symbol);

    const parts = formatted.split(',');
    if (parts.length === 1) return <span className="text-3xl font-semibold" style={{ color: getTextColor(pm.color || '#64748b') }}>{formatted}</span>;

    const integerPart = parts[0].replace(symbol, '').trim();
    const decimalPart = parts[1];

    return (
      <div className="flex items-baseline" style={{ color: getTextColor(pm.color || '#64748b') }}>
        <span className="text-3xl font-semibold">{symbol} {integerPart}</span>
        <span className="text-2xl font-semibold opacity-85">,{decimalPart}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {paymentMethods.map((pm) => {
        const bgColor = pm.color || '#64748b';
        const textColor = getTextColor(bgColor);
        const accountType = getAccountType(pm.type, pm.is_savings_account || false);

        // Custom formatting inside loop to access specific Colors if needed, but we extracted logic.
        // Actually, formatCurrencyPayment needs 'pm' context for color? 
        // No, 'pm' is inside the map. The helper above used 'pm' which is not defined there.
        // Let's move the helper INSIDE the map or pass color.

        const renderBalance = (val: number) => {
          const currCode = ctxCurrency || currency || 'COP';
          const symbol = CURRENCIES.find(c => c.code === currCode)?.symbol || currCode;

          const formatted = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currCode,
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
            currencyDisplay: 'code',
          }).format(val).replace(currCode, symbol);

          const parts = formatted.split(',');
          const integerPart = parts[0].replace(symbol, '').trim();
          const decimalPart = parts.length > 1 ? parts[1] : null;

          return (
            <div className="flex items-baseline" style={{ color: textColor }}>
              <span className="text-3xl font-semibold">{symbol} {integerPart}</span>
              {decimalPart && <span className="text-[0.85em] font-semibold opacity-85">,{decimalPart}</span>}
            </div>
          );
        };

        return (
          <div
            key={pm.id}
            className="relative h-48 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            style={{ backgroundColor: bgColor }}
          >
            {/* Icono círculo sólido */}
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/30 flex items-center justify-center shadow-md text-inherit">
              <span style={{ color: textColor }}>{getIconForType(pm.type)}</span>
            </div>

            {/* Top Level: Name (Left) + Account Type (Right) */}
            <div className="relative z-10 flex items-center justify-between pl-12">
              <p className="text-base font-semibold ml-2" style={{ color: textColor }}>{pm.name}</p>
              <span className="text-xs font-bold uppercase tracking-wide opacity-90" style={{ color: textColor }}>{accountType}</span>
            </div>

            {/* Middle Level: Balance (Prominent, Centered) */}
            <div className="relative z-10 flex flex-col items-start">
              <p className="text-xs font-normal mb-2 opacity-90" style={{ color: textColor }}>
                {pm.type === 'credit' ? 'Disponible' : 'Saldo en débito'}
              </p>
              <div className="" style={{ color: textColor }}>
                {pm.is_savings_account || pm.type === 'debit' || pm.type === 'cash'
                  ? renderBalance(pm.balance)
                  : pm.type === 'credit'
                    ? renderBalance(pm.credit_limit ? pm.credit_limit - pm.balance : pm.balance)
                    : renderBalance(pm.balance)}
              </div>
            </div>

            {/* Bottom Level: Secondary Info + Action Icons */}
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-xs opacity-75" style={{ color: textColor }}>Principal</p>
              {(onEdit || onDelete) && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {onEdit && (
                    <button
                      title="Editar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(pm);
                      }}
                      className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
                      style={{ color: textColor }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      title="Eliminar"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(pm);
                      }}
                      className="h-8 w-8 rounded-lg bg-white/20 hover:bg-red-500/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30"
                      style={{ color: textColor }}
                    >
                      <Trash2 className="h-4 w-4" />
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
          "h-48 rounded-2xl border-2 border-dashed border-border/60 bg-background/50 hover:bg-primary/5 hover:border-primary/40 flex flex-col items-center justify-center gap-2 text-primary font-semibold transition-all duration-500 text-base shadow-md",
          highlighted && [
            "scale-[1.08] ring-4 ring-primary ring-offset-4 ring-offset-background",
            "shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
            "bg-white text-primary border-white font-bold z-10"
          ]
        )}
      >
        <Plus className={cn("h-5 w-5", highlighted && "animate-pulse")} />
        <span className="hidden sm:inline ml-2">Agregar método</span>
      </Button>
    </div>
  );
}
