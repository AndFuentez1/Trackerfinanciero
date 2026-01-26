import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  variant?: 'positive' | 'negative' | 'neutral' | 'warning';
  description?: string;
  className?: string;
}

export function SummaryCard({ title, amount, icon: Icon, variant = 'neutral', description, className }: SummaryCardProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();

  const getCurrencySymbol = (currencyCode: string): string => {
    const curr = CURRENCIES.find(c => c.code === currencyCode);
    return curr?.symbol || currencyCode;
  };

  const formatSmartCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const symbol = getCurrencySymbol(currency || 'COP');
    let formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'code',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(absValue);

    formatted = formatted.replace(currency || 'COP', symbol);

    // Separar símbolo, parte entera y decimales
    const parts = formatted.split(',');
    const integerPart = parts[0]; // "$1.000" o "€1.000"
    const decimalPart = parts.length > 1 && decimalPlaces > 0 ? parts[1] : ''; // "00"

    // Extraer símbolo (puede ser $, €, etc.)
    const extractedSymbol = integerPart.match(/[^0-9.,\s]+/)?.[0] || '$';

    return {
      symbol: extractedSymbol,
      integerPart: integerPart.replace(/[^0-9.,\s]+/g, ''),
      decimalPart,
      fullLength: formatted.length
    };
  };

  const getFontSize = (length: number) => {
    if (length > 18) return 'text-lg lg:text-xl';
    if (length > 15) return 'text-xl lg:text-2xl';
    return 'text-2xl lg:text-3xl';
  };

  const getTextColor = () => {
    return 'text-foreground';
  };

  const getIconColor = () => {
    if (variant === 'positive') return 'text-emerald-500';
    if (variant === 'negative') return 'text-red-500';
    if (variant === 'warning') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const { symbol, integerPart, decimalPart, fullLength } = formatSmartCurrency(amount);
  const fontSize = getFontSize(fullLength);

  return (
    <div className={cn(
      "summary-card overflow-hidden transition-all duration-300",
      className
    )}>
      {/* Icon - top right */}
      <div className="absolute top-5 right-5 z-10">
        <Icon className={cn("h-4 w-4 transition-colors duration-300", getIconColor())} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Label */}
        <p className="text-xs font-medium text-muted-foreground tracking-wide">
          {title}
        </p>

        {/* Amount */}
        <div className="flex items-baseline gap-0.5">
          <span className={cn(
            'font-bold tracking-tight leading-none',
            fontSize,
            getTextColor()
          )}>
            <span style={{ fontSize: '0.7em', opacity: 0.8 }}>{symbol}</span>
            <span>{integerPart}</span>
            {decimalPart && <span className="opacity-60" style={{ fontSize: '0.7em' }}>,{decimalPart}</span>}
          </span>
        </div>

        {description && (
          <p className="text-[10px] text-muted-foreground font-normal">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
