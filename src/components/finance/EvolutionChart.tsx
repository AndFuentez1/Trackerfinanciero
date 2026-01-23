import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Transaction {
  date: string;
  type: string;
  amount: number;
}

interface EvolutionChartProps {
  transactions: Transaction[];
  selectedYears?: string[];
  onSelectedYearsChange?: (years: string[]) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  onSelectAllYears?: () => void;
}

const COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f97316', // orange
  '#ef4444', // red
  '#a855f7', // purple
  '#ec4899', // pink
  '#eab308', // yellow
  '#06b6d4', // cyan
];

export function EvolutionChart({
  transactions,
  selectedYears: controlledYears,
  onSelectedYearsChange,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
  onSelectAllYears,
}: EvolutionChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const years = useMemo(() => {
    const uniqueYears = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    // Always include current year
    uniqueYears.add(currentYear);
    return Array.from(uniqueYears).sort((a, b) => b - a).map(String);
  }, [transactions, currentYear]);

  const [internalMonth, setInternalMonth] = useState<string>('all');
  const [internalYears, setInternalYears] = useState<string[]>(() => years);

  const selectedMonth = controlledMonth ?? internalMonth;
  const selectedYears = controlledYears ?? internalYears;

  useEffect(() => {
    if (controlledYears) {
      setInternalYears(controlledYears);
    }
  }, [controlledYears]);

  useEffect(() => {
    if (controlledMonth) {
      setInternalMonth(controlledMonth);
    }
  }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const setYears = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? updater(selectedYears) : updater;
    const normalized = next.length === 0
      ? [years[0] || currentYear.toString()]
      : next;
    setInternalYears(normalized);
    onSelectedYearsChange?.(normalized);
  };

  // Keep selected years in sync with available years; avoid empty selection
  useEffect(() => {
    if (years.length === 0) return;
    const filtered = selectedYears.filter(y => years.includes(y));
    if (filtered.length !== selectedYears.length) {
      setYears(filtered);
    }
  }, [years, selectedYears]);

  // Available months: siempre mostrar año completo (enero-diciembre)
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

  // Ensure selectedMonth is valid for current selection
  useEffect(() => {
    const validValues = availableMonths.map(m => m.value);
    if (!validValues.includes(selectedMonth)) {
      setMonth('all');
    }
  }, [availableMonths, selectedMonth]);

  const toggleYear = (year: string) => {
    setYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => Number(b) - Number(a))
    );
  };

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
  ];

  const data = useMemo(() => {
    if (transactions.length === 0) return [];

    // Build running balance for each selected year
    const yearBalances: Record<string, Record<string, number>> = {};

    selectedYears.forEach(year => {
      const yearNum = Number(year);
      const yearTxs = transactions
        .filter(t => new Date(t.date).getFullYear() === yearNum)
        .sort((a, b) => a.date.localeCompare(b.date));

      let balance = 0;
      const balanceByPeriod: Record<string, number> = {};

      yearTxs.forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'income' || t.type === 'transfer_in') {
          balance += amount;
        } else if (t.type === 'expense' || t.type === 'transfer_out' || t.type === 'loan') {
          balance -= amount;
        }

        const periodKey = selectedMonth === 'all'
          ? t.date.substring(0, 7)
          : t.date;
        balanceByPeriod[periodKey] = balance;
      });

      yearBalances[year] = balanceByPeriod;
    });

    // Create chart data
    if (selectedMonth === 'all') {
      // Yearly view: siempre 12 meses (enero-diciembre) por año seleccionado
      const monthData: Array<Record<string, any>> = [];

      for (let month = 1; month <= 12; month++) {
        const monthStr = String(month).padStart(2, '0');
        const dataPoint: Record<string, any> = { period: monthStr };

        selectedYears.forEach(year => {
          const monthKey = `${year}-${monthStr}`;
          dataPoint[`year_${year}`] = yearBalances[year][monthKey] ?? null;
        });

        monthData.push(dataPoint);
      }

      return monthData;
    } else {
      // Monthly view: show all days in the selected month (single time), each year as separate line
      // Determine the month
      const monthStr = String(parseInt(selectedMonth)).padStart(2, '0');

      // Find the number of days in this month (use first selected year or current year as reference)
      const refYear = selectedYears.length ? Number(selectedYears[0]) : currentYear;
      const daysInMonth = new Date(refYear, parseInt(selectedMonth) + 1, 0).getDate();

      // Create data for each day
      const dayData: Array<Record<string, any>> = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0');
        const dataPoint: Record<string, any> = { period: dayStr };

        selectedYears.forEach(year => {
          const dayKey = `${year}-${monthStr}-${dayStr}`;
          dataPoint[`year_${year}`] = yearBalances[year]?.[dayKey] ?? null;
        });

        dayData.push(dataPoint);
      }

      return dayData;
    }
  }, [transactions, selectedYears, selectedMonth]);

  const formatPeriod = (period: string) => {
    if (selectedMonth === 'all') {
      const monthNum = Number(period);
      const date = new Date(2000, monthNum - 1, 1);
      return date.toLocaleDateString('es-CO', { month: 'short' });
    } else {
      return String(Number(period));
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-[#F4F5F7] rounded-xl border border-arquitectura-2/30 p-6 h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <p>No hay datos suficientes para mostrar la evolución.</p>
      </div>
    );
  }

  // Keep controls visible even when no years selected

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Evolución del Balance</h3>
          <p className="text-sm text-muted-foreground">Saldo acumulado por período</p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Month selector first */}
          <Select value={selectedMonth} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px] h-9 bg-background/50">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m.value} value={m.value} className="text-center">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Multi-year selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Años ({selectedYears.length})
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 text-center" align="end" sideOffset={4}>
              <div className="px-2 py-1.5">
                <Button
                  onClick={() => {
                    if (onSelectAllYears) {
                      onSelectAllYears();
                    } else {
                      setYears([...years]);
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 w-full"
                >
                  Seleccionar todos
                </Button>
              </div>
              {years.map(year => (
                <DropdownMenuCheckboxItem
                  key={year}
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => toggleYear(year)}
                  className="text-center"
                >
                  {year}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear selection pinned to the far right */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 ml-auto"
            onClick={() => {
              setMonth('all');
              if (years.length === 0) {
                setYears([currentYear.toString()]);
                return;
              }
              const preferred = years.includes(currentYear.toString()) ? currentYear.toString() : years[0];
              setYears([preferred]);
            }}
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* Year color legend */}
      <div className="flex flex-wrap gap-3 px-2">
        {selectedYears.map((year, idx) => (
          <div key={year} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-xs font-medium">Año {year}</span>
          </div>
        ))}
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 28, left: 24, bottom: 0 }}>
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
              tickFormatter={formatCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '12px'
              }}
              formatter={(value: number | null, name: string) => {
                // Extract year from dataKey (format: "year_2024")
                const year = name.replace('year_', '');
                return [formatCurrency(value), `Año ${year}`];
              }}
              labelFormatter={(label) => {
                if (selectedMonth === 'all') {
                  const monthNum = Number(label);
                  const date = new Date(2000, monthNum - 1, 1);
                  return date.toLocaleDateString('es-CO', { month: 'long' });
                } else {
                  const refYear = Number(selectedYears[0]);
                  const monthNum = Number(selectedMonth);
                  const dayNum = Number(label);
                  const date = new Date(refYear, monthNum - 1, dayNum);
                  return date.toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  });
                }
              }}
            />
            {selectedYears.map((year, idx) => (
              <Line
                key={year}
                dataKey={`year_${year}`}
                stroke={COLORS[idx % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 5, strokeWidth: 2, fill: COLORS[idx % COLORS.length], stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={1000}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

