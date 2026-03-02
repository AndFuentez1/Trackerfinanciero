import type { CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useMemo } from 'react';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from '@/shared/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';

interface ExpenseChartProps {
  data: { category: string; category_id?: string | null; amount: number }[];
  categories: CategoryItem[];
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  selectedYears: string[];
  onSelectedYearsChange: (years: string[]) => void;
  availableYears: string[];
  onSelectAllYears?: () => void;
}

export function ExpenseChart({
  data,
  categories,
  selectedMonth,
  onSelectedMonthChange,
  selectedYears,
  onSelectedYearsChange,
  availableYears,
  onSelectAllYears
}: ExpenseChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();

  const availableMonths = useMemo(() => ([
    { value: 'all', label: 'Todo el año' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]), []);

  const toggleYear = (year: string) => {
    const newSelection = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];

    if (newSelection.length === 0) {
      return;
    }
    onSelectedYearsChange(newSelection);
  };

  const chartData = useMemo(() => {
    if (data.length === 0) { return []; }

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

  interface LegendPayload {
    value: string;
    color: string;
    payload: { name: string; value: number; color: string };
  }

  const CustomLegend = ({ payload }: { payload: LegendPayload[] }) => {
    return (
      <div className="flex flex-col gap-1 mt-6 w-full px-2">
        {payload.map((entry: LegendPayload, index: number) => {
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
                <span className="text-[10px] font-bold text-slate-700 tabular-nums">
                  <span style={{ fontSize: '0.7em', opacity: 0.8 }}>{symbol}</span> {integerPart}
                  {decimalPart && <span style={{ fontSize: '0.7em', opacity: 0.8 }}>,{decimalPart}</span>}
                </span>
                <span className="text-[10px] font-black text-slate-700 bg-slate-100/50 px-1.5 py-0.5 rounded">
                  {((entry.payload.value / total) * 100).toFixed(decimalPlaces)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <Card className="shadow-sm border-border/50 bg-slate-50/50 backdrop-blur-sm h-full flex flex-col items-center justify-center text-muted-foreground p-6 min-h-[400px]">
        <p>No hay gastos registrados para este periodo.</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border/50 bg-slate-50/50 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="text-center">
          <CardTitle className="text-lg font-semibold text-foreground">Distribución</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">Gastos por categoría</CardDescription>
        </div>
      </CardHeader>


      <CardContent className="flex-1 p-4 pt-2 flex flex-col items-center min-h-[400px]">
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
      </CardContent>
    </Card>
  );
}
