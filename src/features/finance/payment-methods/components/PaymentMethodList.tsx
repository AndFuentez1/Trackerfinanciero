import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { PayCreditCardDialog } from './PayCreditCardDialog';
import { Plus, CreditCard, Wallet, Banknote, PiggyBank, Landmark, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/core/utils';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';

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
  if (isSavings) { return 'ahorro'; }
  switch (type) {
    case 'debit':
      return 'débito';
    case 'credit':
      return 'crédito';
    case 'cash':
      return 'efectivo';
    default:
      return 'digital';
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
  const { addTransfer } = useFinanceData();

  const handlePayCard = async (sourceId: string, targetId: string, amount: number, description: string, date: string) => {
    try {
      await addTransfer({
        fromId: sourceId,
        toId: targetId,
        amount,
        description,
        date
      });
      return { error: null };
    } catch (error) {
      return { error };
    }
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
          return (
            <div className="" style={{ color: textColor }}>
              <CurrencyDisplay
                amount={val}
                currencyCode={ctxCurrency || currency}
                className="text-2xl sm:text-3xl font-bold"
                hideSymbol={false}
              />
            </div>
          );
        };

        return (
          <div
            key={pm.id}
            className="relative h-48 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            style={{ backgroundColor: bgColor }}
          >
            {/* Top Level: Icon + Name (Perfect Alignment) + Account Type (Capitalized) */}
            <div className="relative z-10 flex items-start justify-between w-full shrink-0">
              <div className="flex items-start gap-3 truncate">
                <div className="text-white flex items-center justify-center shrink-0 mt-[1px]">
                  {getIconForType(pm.type)}
                </div>
                <p className="text-base font-bold truncate leading-none mt-[3.5px]" style={{ color: textColor }}>{pm.name}</p>
              </div>
              <span className="text-sm font-semibold tracking-tight opacity-90 whitespace-nowrap capitalize leading-none mt-[4px]" style={{ color: textColor }}>{accountType}</span>
            </div>

            {/* Middle Level: Balance (Prominent, Centered) */}
            <div className="relative z-10 flex flex-col items-start">
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
              <p className="text-[10px] font-medium uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                {pm.type === 'credit' ? 'Disponible en crédito' : 'Saldo en débito'}
              </p>

              <div className="flex gap-2">
                {/* Pay Button for Credit Cards */}
                {variant === 'dashboard' && pm.type === 'credit' && (
                  <PayCreditCardDialog
                    card={pm}
                    onPay={handlePayCard}
                    trigger={
                      <button
                        title="Pagar Tarjeta"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 px-3 rounded-lg bg-white/20 hover:bg-white/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30 text-xs font-semibold mr-1"
                        style={{ color: textColor }}
                      >
                        Pagar
                      </button>
                    }
                  />
                )}

                {(onEdit || onDelete) && (
                  <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
          </div>
        );
      })}

      {/* Add Payment Method Card */}
      <Button
        onClick={onAdd}
        className={cn(
          "h-48 rounded-2xl border border-border bg-gray-50/50 hover:bg-primary/5 hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-2 text-muted-foreground font-semibold transition-all duration-500 text-base shadow-none",
          highlighted && [
            "scale-[1.08] ring-4 ring-primary ring-offset-4 ring-offset-background",
            "shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
            "bg-white text-primary border-white font-bold z-10"
          ]
        )}
      >
        <Plus className={cn("h-5 w-5", highlighted && "")} />
        <span className="hidden sm:inline ml-2">Agregar método</span>
      </Button>
    </div>
  );
}






