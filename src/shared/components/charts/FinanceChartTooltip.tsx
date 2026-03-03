import type { TooltipProps } from 'recharts';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';

interface FinanceChartTooltipProps extends TooltipProps<number, string> {
  labelFormatter?: (label: string | number | undefined) => string;
}

export function FinanceChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: FinanceChartTooltipProps) {
  const { currency } = useFormatCurrency();

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const title = labelFormatter ? labelFormatter(label) : String(label ?? '');

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <div className="mb-1 text-[11px] font-semibold text-foreground">{title}</div>
      <div className="space-y-1">
        {payload
          .filter((item, index, self) => {
            // Deduplicate Balance if values are the same
            if (item.name === 'Balance') {
              const firstBalanceIndex = self.findIndex(i => i.name === 'Balance');
              if (index !== firstBalanceIndex) {
                const firstBalanceValue = self[firstBalanceIndex].value;
                if (item.value === firstBalanceValue) {
                  return false;
                }
              }
            }

            if (item.dataKey === 'balanceAjuste' && typeof item.payload?.balanceAjusteDelta === 'number' && item.payload.balanceAjusteDelta !== 0) {
              return true;
            }
            return typeof item.value === 'number' && !Number.isNaN(item.value);
          })
          .map((item) => {
            const dataKey = typeof item.dataKey === 'string' ? item.dataKey : String(item.dataKey);
            const adjustment =
              dataKey === 'balanceAjuste' &&
                typeof item.payload?.balanceAjusteDelta === 'number'
                ? item.payload.balanceAjusteDelta
                : null;
            const value = adjustment ?? Number(item.value);
            let color = item.color || item.payload?.fill || item.payload?.stroke;
            if (dataKey === 'balanceAjuste') {
              color = 'hsl(var(--primary))';
            }

            return (
              <div key={dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color || 'hsl(var(--muted-foreground))' }}
                  />
                  <span className="text-muted-foreground">{item.name ?? dataKey}</span>
                </div>
                <CurrencyDisplay amount={value} currencyCode={currency || DEFAULT_CURRENCY_CODE} className="font-semibold text-foreground" />
              </div>
            );
          })}
      </div>
    </div>
  );
}
