import type { LucideIcon } from 'lucide-react';
import { cn } from '@/core/utils';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useFinance } from '@/features/finance/context/FinanceContext';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  variant?: 'positive' | 'negative' | 'neutral' | 'warning';
  description?: string;
  className?: string;
}

export function SummaryCard({ title, amount, icon: Icon, variant = 'neutral', description, className }: SummaryCardProps) {
  const { currency } = useFinance();

  const getTextColor = () => {
    return 'text-foreground';
  };

  const getIconColor = () => {
    if (variant === 'positive') { return 'text-primary'; }
    if (variant === 'negative') { return 'text-destructive'; }
    if (variant === 'warning') { return 'text-orange-500'; }
    return 'text-muted-foreground';
  };

  return (
    <div className={cn(
      "summary-card p-4 sm:p-5 flex flex-col gap-1 h-full min-h-[110px] justify-between bg-slate-50/50 backdrop-blur-sm",
      className
    )}>

      <div className="space-y-2.5">
        {/* Header: Icon & Title Area */}
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 items-center justify-center p-0.5 rounded-md bg-background/50 ring-1 ring-border/50">
            <Icon className={cn("h-4 w-4 transition-colors duration-300", getIconColor())} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium text-muted-foreground tracking-tight leading-none">
              {title}
            </p>
            {description && (
              <p className="text-[11px] text-muted-foreground font-normal leading-none mt-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Content: Amount - Independent layout hierarchy */}
        <div className="pl-0 space-y-1">
          <CurrencyDisplay
            amount={amount}
            currencyCode={currency}
            className={cn(
              'font-bold tracking-tight leading-none',
              "text-2xl",
              getTextColor()
            )}
          />
        </div>
      </div>
    </div>
  );
}




