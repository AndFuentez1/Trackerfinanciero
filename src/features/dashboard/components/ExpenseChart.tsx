import { useMemo } from 'react';
import { Bar, Line, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/hooks/useFinanceData';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/line-charts-1';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpenseChartProps {
  transactions: Transaction[];
  selectedYears: number[];
}

export function ExpenseChart({ transactions = [], selectedYears = [] }: ExpenseChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();

  const getCurrencySymbol = (currencyCode: string): string => {
    const curr = CURRENCIES.find(c => c.code === currencyCode);
    return curr?.symbol || currencyCode;
  };

  const symbol = getCurrencySymbol(currency || 'COP');

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // Filter transactions by selected years
    const filteredTransactions = selectedYears.length > 0
      ? transactions.filter(t => {
        const year = new Date(t.date).getFullYear();
        return selectedYears.includes(year);
      })
      : transactions;

    // Aggregate by month (Jan-Dec) across all selected years
    const monthlyData: Record<string, { income: number; expenses: number }> = {};

    filteredTransactions.forEach(transaction => {
      const date = parseISO(transaction.date);
      const monthKey = format(date, 'MMM', { locale: es }); // "Ene", "Feb", etc.

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      if (transaction.type === 'income') {
        monthlyData[monthKey].income += transaction.amount;
      } else if (transaction.type === 'expense') {
        monthlyData[monthKey].expenses += transaction.amount;
      }
    });

    // Convert to array and ensure all 12 months exist
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map(month => ({
      month,
      income: monthlyData[month]?.income || 0,
      expenses: monthlyData[month]?.expenses || 0,
      balance: (monthlyData[month]?.income || 0) - (monthlyData[month]?.expenses || 0),
    }));
  }, [transactions, selectedYears]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      currencyDisplay: 'symbol',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value).replace('COP', symbol).trim();
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground p-6 border border-dashed border-border/50 rounded-xl bg-muted/5">
        <p className="text-sm font-medium">No hay transacciones registradas para este periodo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Ingresos vs Gastos</h3>
        <p className="text-sm text-muted-foreground">
          {selectedYears.length > 0
            ? `Agregado por mes (${selectedYears.join(', ')})`
            : 'Agregado por mes (todos los años)'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
              return value.toString();
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <p className="text-sm font-semibold mb-2">{payload[0].payload.month}</p>
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        {entry.name}:
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(Number(entry.value))}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
          />
          <Bar
            dataKey="income"
            name="Ingresos"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar
            dataKey="expenses"
            name="Gastos"
            fill="#f87171"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#9ca3af"
            strokeWidth={2}
            dot={{ fill: '#9ca3af', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
