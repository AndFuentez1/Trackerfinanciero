import type { TooltipProps } from 'recharts';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';

interface FinanceChartTooltipProps extends TooltipProps<number, string> {
  labelFormatter?: (label: string | number | undefined) => string;
}

export function FinanceChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: FinanceChartTooltipProps) {
  const { formatCurrency } = useFormatCurrency();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const title = labelFormatter ? labelFormatter(label) : String(label ?? '');

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="mb-1 text-[11px] font-semibold text-foreground">{title}</div>
      <div className="space-y-1">
        {payload
          .filter(item => typeof item.value === 'number' && !Number.isNaN(item.value))
          .map((item) => {
            const dataKey = typeof item.dataKey === 'string' ? item.dataKey : String(item.dataKey);
            const adjustment =
              dataKey === 'balanceAjuste' &&
                typeof item.payload?.balanceAjusteDelta === 'number'
                ? item.payload.balanceAjusteDelta
                : null;
            const value = adjustment ?? Number(item.value);
            const color = item.color || item.payload?.fill || item.payload?.stroke;

            return (
              <div key={dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color || 'hsl(var(--muted-foreground))' }}
                  />
                  <span className="text-muted-foreground">{item.name ?? dataKey}</span>
                </div>
                <CurrencyDisplay amount={value} currencyCode="COP" className="font-semibold text-foreground" />
              </div>
            );
          })}
      </div>
    </div>
  );
}
