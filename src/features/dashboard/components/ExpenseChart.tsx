import { useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { CategoryItem } from '@/hooks/useFinanceData';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/line-charts-1';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge-2';

interface ExpenseChartProps {
  data: { category: string; category_id?: string | null; amount: number }[];
  categories: CategoryItem[]
}

export function ExpenseChart({ data, categories }: ExpenseChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();

  const getCurrencySymbol = (currencyCode: string): string => {
    const curr = CURRENCIES.find(c => c.code === currencyCode);
    return curr?.symbol || currencyCode;
  };

  const symbol = getCurrencySymbol(currency || 'COP');

  const { chartData, chartConfig } = useMemo(() => {
    if (data.length === 0) return { chartData: [], chartConfig: {} };

    // Sort by amount descending
    const sortedData = [...data].sort((a, b) => b.amount - a.amount);
    let finalData = [];

    if (sortedData.length <= 5) {
      finalData = sortedData.map(item => ({
        name: item.category,
        value: item.amount,
        color: categories.find(c => c.id === item.category_id || c.name === item.category)?.color || '#94a3b8'
      }));
    } else {
      const top5 = sortedData.slice(0, 5);
      const others = sortedData.slice(5).reduce((sum, item) => sum + item.amount, 0);

      finalData = top5.map(item => ({
        name: item.category,
        value: item.amount,
        color: categories.find(c => c.id === item.category_id || c.name === item.category)?.color || '#94a3b8'
      }));

      finalData.push({
        name: 'Otros',
        value: others,
        color: '#cbd5e1' // slate-300 for others
      });
    }

    const config: ChartConfig = {};
    finalData.forEach((item, index) => {
      const key = item.name.replace(/\s+/g, '_').toLowerCase();
      // We map the loop data to expected recharts keys if needed or just use name as key
      config[item.name] = {
        label: item.name,
        color: item.color,
      };
    });

    return { chartData: finalData, chartConfig: config };
  }, [data, categories]);

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'symbol',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value).replace('COP', symbol).trim();
  };


  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground p-6 border border-dashed border-border/50 rounded-xl bg-muted/5">
        <p className="text-sm font-medium">No hay gastos registrados para este periodo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Distribución de Gastos</h3>
        <p className="text-sm text-muted-foreground">Top categorías del periodo</p>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[300px] w-full"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value, name) => [formatCurrency(Number(value)), name]} />}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="mt-6 space-y-3">
        {chartData.map((item, index) => {
          const percentage = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={index} className="flex items-center justify-between text-sm group">
              <div className="flex items-center gap-2.5">
                <span className="flex size-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-foreground">{formatCurrency(item.value)}</span>
                <Badge variant="secondary" className="w-[52px] justify-center text-[10px] h-5 px-0 font-bold bg-muted text-muted-foreground border-transparent">
                  {percentage}%
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
