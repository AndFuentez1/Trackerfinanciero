import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';

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
  
  const formatSmartCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(absValue);

    // Separar símbolo, parte entera y decimales
    const parts = formatted.split(',');
    const integerPart = parts[0]; // "$1.000"
    const decimalPart = parts.length > 1 && decimalPlaces > 0 ? parts[1] : ''; // "00"

    return {
      symbol: '$',
      integerPart: integerPart.replace('$', ''),
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

  const getVariantIcon = () => {
    if (variant === 'positive') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (variant === 'negative') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const { symbol, integerPart, decimalPart, fullLength } = formatSmartCurrency(amount);
  const fontSize = getFontSize(fullLength);

  return (
    <div className={cn(
      "summary-card",
      className
    )}>
      {/* Icon - top right */}
      <div className="absolute top-5 right-5">
        <Icon className={cn("h-4 w-4 transition-colors duration-200", getIconColor())} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Label */}
        <p className="text-xs font-medium text-muted-foreground tracking-wide">
          {title}
        </p>

        {/* Amount */}
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-medium text-muted-foreground/60">
            {symbol}
          </span>
          <span className={cn(
            'font-bold tracking-tight leading-none',
            fontSize,
            getTextColor()
          )}>
            {integerPart}
            {decimalPart && <span className="opacity-60" style={{ fontSize: '0.6em' }}>,{decimalPart}</span>}
          </span>
          {getVariantIcon() && (
            <span className="ml-2">
              {getVariantIcon()}
            </span>
          )}
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
