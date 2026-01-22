import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  variant?: 'positive' | 'negative' | 'neutral' | 'warning';
  description?: string;
  className?: string;
}

export function SummaryCard({ title, amount, icon: Icon, variant = 'neutral', description, className }: SummaryCardProps) {
  const formatSmartCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(absValue);

    // Remove currency symbol for custom formatting
    const numberPart = formatted.replace(/[^\d.,]/g, '');

    return {
      symbol: '$',
      number: numberPart,
      fullLength: formatted.length
    };
  };

  const getFontSize = (length: number) => {
    if (length > 18) return 'text-lg lg:text-xl';
    if (length > 15) return 'text-xl lg:text-2xl';
    return 'text-2xl lg:text-3xl';
  };

  const getTextColor = () => {
    if (variant === 'positive') return 'text-emerald-600';
    if (variant === 'negative') return 'text-red-600';
    if (variant === 'warning') return 'text-amber-600';
    return 'text-foreground';
  };

  const getIconColor = () => {
    if (variant === 'positive') return 'text-emerald-500';
    if (variant === 'negative') return 'text-red-500';
    if (variant === 'warning') return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const { symbol, number, fullLength } = formatSmartCurrency(amount);
  const fontSize = getFontSize(fullLength);

  return (
    <div className={cn(
      "bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all duration-200 group relative flex flex-col justify-between h-full",
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
            {number}
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
