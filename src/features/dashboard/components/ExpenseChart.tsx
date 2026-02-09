import { CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMemo } from 'react';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';

interface ExpenseChartProps {
  data: { category: string; category_id?: string | null; amount: number }[];
  categories: CategoryItem[]
}

export function ExpenseChart({ data, categories }: ExpenseChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Sort by amount descending
    const sortedData = [...data].sort((a, b) => b.amount - a.amount);

    if (sortedData.length <= 5) {
      return sortedData.map(item => ({
        name: item.category,
        value: item.amount,
        color: categories.find(c => c.id === item.category_id || c.name === item.category)?.color || '#94a3b8'
      }));
    }

    const top5 = sortedData.slice(0, 5);
    const others = sortedData.slice(5).reduce((sum, item) => sum + item.amount, 0);

    const result = top5.map(item => ({
      name: item.category,
      value: item.amount,
      color: categories.find(c => c.id === item.category_id || c.name === item.category)?.color || '#94a3b8'
    }));

    result.push({
      name: 'Otros',
      value: others,
      color: '#cbd5e1' // slate-300 for others
    });

    return result;
  }, [data, categories]);

  const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  const getCurrencySymbol = (currencyCode: string): string => {
    const curr = CURRENCIES.find(c => c.code === currencyCode);
    return curr?.symbol || currencyCode;
  };

  const formatCurrencyString = (value: number) => {
    const symbol = getCurrencySymbol(currency || 'COP');
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'code',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
    
    return formatted.replace(currency || 'COP', symbol);
  };

  const formatCurrencyForLegend = (value: number): { symbol: string; amount: string } => {
    const symbol = getCurrencySymbol(currency || 'COP');
    let formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'code',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
    
    formatted = formatted.replace(currency || 'COP', symbol);
    
    // Split symbol and amount
    const symbolMatch = formatted.match(/^[^\d]+/);
    const displaySymbol = symbolMatch ? symbolMatch[0].trim() : symbol;
    const amount = formatted.replace(/^[^\d]+/, '').trim();
    
    return { symbol: displaySymbol, amount };
  };

  // Formatter for axis: must return string only
  const formatCurrencyAxis = (value: number) => {
    const symbol = getCurrencySymbol(currency || 'COP');
    const formatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'symbol',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
    return formatted; // Only string, no JSX
  };

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-arquitectura-2/30 p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <p>No hay gastos registrados para este periodo.</p>
      </div>
    );
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-col gap-1 mt-6 w-full px-2">
        {payload.map((entry: any, index: number) => {
          const { symbol, amount } = formatCurrencyForLegend(entry.payload.value);
          const [integerPart, decimalPart] = amount.split(',');
          
          return (
            <div key={`item-${index}`} className="flex items-center justify-between py-1.5 border-b border-slate-100/50 last:border-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-semibold text-slate-700 truncate">{entry.value}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                  <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{symbol}</span> {integerPart}
                  {decimalPart && <span style={{ fontSize: '0.8em', opacity: 0.6 }}>,{decimalPart}</span>}
                </span>
                <span className="text-[10px] font-black text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded">
                  {((entry.payload.value / total) * 100).toFixed(decimalPlaces)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Distribución de Gastos</h3>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Top categorías del periodo</p>
      </div>

      <div className="flex-1 min-h-[450px] flex flex-col items-center">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
              animationDuration={1500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrencyAxis(value)}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                fontSize: '12px',
                fontWeight: '600'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <CustomLegend payload={chartData.map(d => ({ value: d.name, color: d.color, payload: d }))} />
      </div>
    </div>
  );
}




