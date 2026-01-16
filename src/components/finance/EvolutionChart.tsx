import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  date: string;
  type: string;
  amount: number;
}

interface EvolutionChartProps {
  transactions: Transaction[];
}

export function EvolutionChart({ transactions }: EvolutionChartProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' for yearly view, '1'-'12' for monthly view

  const years = useMemo(() => {
    const uniqueYears = Array.from(new Set(transactions.map(t => new Date(t.date).getFullYear())));
    if (!uniqueYears.includes(currentYear)) uniqueYears.push(currentYear);
    return uniqueYears.sort((a, b) => b - a).map(String);
  }, [transactions, currentYear]);

  const months = [
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
  ].filter(m => {
    // CRITICAL FIX: If viewing current year, only show months up to current month
    if (selectedYear === currentYear.toString() && m.value !== 'all') {
      return Number(m.value) <= currentMonth;
    }
    return true;
  });

  const data = useMemo(() => {
    if (transactions.length === 0) return [];

    // To calculate growth, we need all transactions sorted by date
    const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    let runningBalance = 0;
    const history: { date: string, balance: number }[] = [];

    sortedTxs.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income' || t.type === 'transfer_in') {
        runningBalance += amount;
      } else if (t.type === 'expense' || t.type === 'transfer_out' || t.type === 'loan') {
        runningBalance -= amount;
      }
      // Note: 'saving' and 'investment' are often transfers between accounts,
      // but if they are tracked as outflows from the main tracking period, they'd be here.
      // We'll treat them as internal/non-deductible for "Total Balance" unless they are explicitly 'expense'.

      history.push({ date: t.date, balance: runningBalance });
    });

    if (selectedMonth === 'all') {
      // Yearly view: show end of month balances for full year, but only render data to current month
      const yearlyData: Record<string, number | null> = {};
      const yearPrefix = selectedYear;
      const selectedYearNum = Number(selectedYear);

      // Always show all 12 months on the X-axis
      for (let m = 1; m <= 12; m++) {
        const monthStr = m.toString().padStart(2, '0');
        const key = `${yearPrefix}-${monthStr}`;

        // CRITICAL FIX: Only populate balance data up to current month
        // Future months show null (no line drawn)
        if (selectedYearNum < currentYear || (selectedYearNum === currentYear && m <= currentMonth)) {
          // Find last balance record before or on this month
          const lastEntry = history.filter(h => h.date <= `${key}-31`).slice(-1)[0];
          yearlyData[key] = lastEntry ? lastEntry.balance : (history[0]?.date > `${key}-31` ? 0 : history.filter(h => h.date < `${key}-01`).slice(-1)[0]?.balance || 0);
        } else {
          // Future month: don't show data point
          yearlyData[key] = null;
        }
      }

      return Object.entries(yearlyData).map(([period, balance]) => ({
        period,
        balance,
      })).sort((a, b) => a.period.localeCompare(b.period));
    } else {
      // Monthly view: show daily balances for full month, but only render to current day
      const dailyData: Record<string, number | null> = {};
      const monthPrefix = `${selectedYear}-${selectedMonth.padStart(2, '0')}`;
      const selectedMonthNum = Number(selectedMonth);

      // Always show full month (28-31 days) on the X-axis
      const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = d.toString().padStart(2, '0');
        const key = `${monthPrefix}-${dayStr}`;

        // CRITICAL FIX: Only populate balance data up to current day (if current month)
        const isCurrentMonth = Number(selectedYear) === currentYear && selectedMonthNum === currentMonth;
        const currentDay = new Date().getDate();

        if (!isCurrentMonth || d <= currentDay) {
          // This day has data or is in the past
          const lastEntry = history.filter(h => h.date <= key).slice(-1)[0];
          dailyData[key] = lastEntry ? lastEntry.balance : (history[0]?.date > key ? 0 : history.filter(h => h.date < `${monthPrefix}-01`).slice(-1)[0]?.balance || 0);
        } else {
          // Future day in current month: don't show data point
          dailyData[key] = null;
        }
      }

      return Object.entries(dailyData).map(([period, balance]) => ({
        period,
        balance,
      })).sort((a, b) => a.period.localeCompare(b.period));
    }
  }, [transactions, selectedYear, selectedMonth]);

  const formatPeriod = (period: string) => {
    const date = new Date(period + (period.length === 7 ? '-01' : '') + 'T00:00:00');
    if (selectedMonth === 'all') {
      return date.toLocaleDateString('es-CO', { month: 'short' });
    } else {
      return date.getDate().toString();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <p>No hay datos suficientes para mostrar la evolución.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Evolución del Balance</h3>
          <p className="text-sm text-muted-foreground">Crecimiento total acumulado</p>
        </div>

        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9 bg-background/50">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 bg-background/50">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="h-[300px] w-100%">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="period"
              tickFormatter={formatPeriod}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              dy={10}
            />
            <YAxis
              hide={true}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
              formatter={(value: number) => [formatCurrency(value), 'Balance Total']}
              labelFormatter={(label) => {
                const date = new Date(label + (label.length === 7 ? '-01' : '') + 'T00:00:00');
                return date.toLocaleDateString('es-CO', {
                  day: selectedMonth !== 'all' ? 'numeric' : undefined,
                  month: 'long',
                  year: 'numeric'
                });
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#10b981"
              strokeWidth={3}
              fill="#10b981"
              fillOpacity={0.3}
              animationDuration={1500}
              isAnimationActive={true}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

