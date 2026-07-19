import { useState, useEffect, useRef } from 'react';
import type { PaymentMethod } from '@/features/finance/hooks/useFinanceData';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { PayCreditCardDialog } from './PayCreditCardDialog';
import { Plus, CreditCard, Wallet, Banknote, PiggyBank, Landmark, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/core/utils';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';

interface PaymentMethodListProps {
  paymentMethods: PaymentMethod[];
  variant?: 'dashboard' | 'settings';
  onEdit?: (pm: PaymentMethod) => void;
  onDelete?: (pm: PaymentMethod) => void;
  onAdd?: () => void;
  highlighted?: boolean;
}

// Color scheme helper based on brightness
const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
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

export function PaymentMethodList({
  paymentMethods,
  variant = 'dashboard',
  onEdit,
  onDelete,
  onAdd,
  highlighted
}: PaymentMethodListProps) {
  const { currency: ctxCurrency } = useFinance();
  const { currency, formatCurrencySmall } = useFormatCurrency();
  const { addTransfer } = useFinanceData();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Responsive width tracking
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine limits for 3 rows
  let maxCards = 9; // Desktop (3 columns * 3 rows)
  if (width < 640) {
    maxCards = 3;  // Mobile (1 column * 3 rows)
  } else if (width < 1024) {
    maxCards = 6;  // Tablet (2 columns * 3 rows)
  }

  const totalCards = paymentMethods.length + 1;
  const isSliderActive = totalCards > maxCards;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const scrollAmount = 340; // width of one card + gap
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

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

  const renderCardContent = (pm: PaymentMethod) => {
    const bgColor = pm.color || '#64748b';
    const textColor = getTextColor(bgColor);
    const accountType = getAccountType(pm.type, pm.is_savings_account || false);

    const renderBalance = (val: number) => (
      <div className="" style={{ color: textColor }}>
        <CurrencyDisplay
          amount={val}
          currencyCode={ctxCurrency || currency}
          className="text-2xl sm:text-3xl font-bold"
          hideSymbol={false}
        />
      </div>
    );

    return (
      <div
        className="relative h-full min-h-[12rem] rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
        style={{ backgroundColor: bgColor }}
      >
        {/* Top Level: Icon + Name + Account Type */}
        <div className="relative z-10 flex items-start justify-between w-full shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="text-white flex items-center justify-center shrink-0 mt-[1px]">
              {getIconForType(pm.is_savings_account ? 'savings' : pm.type)}
            </div>
            <p className="text-base font-bold truncate leading-none mt-[3.5px]" style={{ color: textColor }}>{pm.name}</p>
          </div>
          <span className="text-sm font-semibold tracking-tight opacity-90 whitespace-nowrap capitalize leading-none mt-[4px]" style={{ color: textColor }}>{accountType}</span>
        </div>

        {/* Middle Level: Balance */}
        <div className="relative z-10 flex flex-col items-start py-4">
          <div className="" style={{ color: textColor }}>
            {pm.is_savings_account || pm.type === 'debit' || pm.type === 'cash'
              ? renderBalance(pm.balance)
              : pm.type === 'credit'
                ? renderBalance(pm.credit_limit ? pm.credit_limit - pm.balance : pm.balance)
                : renderBalance(pm.balance)}
          </div>
        </div>

        {/* Bottom Level: Actions */}
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-wider opacity-80" style={{ color: textColor }}>
            {pm.type === 'credit' ? 'Disponible en crédito' : 'Saldo en débito'}
          </p>

          <div className="flex gap-2">
            {variant === 'dashboard' && pm.type === 'credit' && (
              <PayCreditCardDialog
                card={pm}
                onPay={handlePayCard}
                trigger={
                  <button
                    title="Pagar Tarjeta"
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 px-3 rounded-lg bg-white/20 hover:bg-white/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30 text-xs font-semibold mr-1 cursor-pointer"
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
                    className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30 cursor-pointer"
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
                    className="h-8 w-8 rounded-lg bg-white/20 hover:bg-red-500/40 text-inherit flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/30 cursor-pointer"
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
  };

  const renderAddButton = () => (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "w-full h-full min-h-[12rem] rounded-2xl border border-border bg-gray-50/50 hover:bg-primary/5 hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-2 text-muted-foreground font-semibold transition-all duration-500 text-base shadow-none cursor-pointer",
        highlighted && [
          "scale-[1.08] ring-4 ring-primary ring-offset-4 ring-offset-background",
          "shadow-[0_0_30px_0_hsl(var(--primary)/0.8)]",
          "bg-white text-primary border-white font-bold z-10"
        ]
      )}
    >
      <Plus className={cn("h-5 w-5", highlighted && "")} />
      <span>Agregar método</span>
    </button>
  );

  if (isSliderActive) {
    return (
      <div className="relative group w-full">
        {/* Navigation Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto cursor-pointer"
          title="Desplazar izquierda"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-auto cursor-pointer"
          title="Desplazar derecha"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Horizontal scrollbar slider */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/25 scrollbar-track-transparent w-full pr-2 -mr-2"
        >
          {paymentMethods.map((pm) => (
            <div key={pm.id} className="snap-start shrink-0 w-full sm:w-[320px] md:w-[340px]">
              {renderCardContent(pm)}
            </div>
          ))}
          <div className="snap-start shrink-0 w-full sm:w-[320px] md:w-[340px] min-h-[12rem]">
            {renderAddButton()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {paymentMethods.map((pm) => (
        <div key={pm.id} className="h-full">
          {renderCardContent(pm)}
        </div>
      ))}
      <div className="min-h-[12rem]">
        {renderAddButton()}
      </div>
    </div>
  );
}