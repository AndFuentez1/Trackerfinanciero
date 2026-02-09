import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/core/utils';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from '@/shared/ui/button';
import { ChevronDown, Filter, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { format, parseISO, isSameMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = [
  '#0ea5e9', // sky-500 (Primary-ish blue)
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
];

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
}

interface EvolutionChartProps {
  transactions: Transaction[];
  selectedYears: string[];
  onSelectedYearsChange: (years: string[]) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  onSelectAllYears?: () => void;
  currentBalance?: number;
}

export function EvolutionChart({
  transactions,
  selectedYears,
  onSelectedYearsChange,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
  onSelectAllYears,
  currentBalance = 0,
}: EvolutionChartProps) {
  const decimalPlaces = useDecimalPlaces();
  const { currency } = useFinance();
  const currentYear = new Date().getFullYear();

  // --- State for Filters ---
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // --- Date Selection Logic ---
  const availableYears = useMemo(() => {
    const uniqueYears = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    uniqueYears.add(currentYear);
    return Array.from(uniqueYears).sort((a, b) => b - a).map(String);
  }, [transactions, currentYear]);

  const [internalMonth, setInternalMonth] = useState<string>('all');

  const selectedMonth = controlledMonth ?? internalMonth;

  useEffect(() => { if (controlledMonth) setInternalMonth(controlledMonth); }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const toggleYear = (year: string) => {
    const newSelection = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];

    // Prevent empty selection? 
    if (newSelection.length === 0) return;

    onSelectedYearsChange(newSelection);
  };

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

  // --- Data Processing ---
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Process deltas
    const txsWithDelta = sortedTxs.map(tx => {
      let delta = 0;
      const amt = Number(tx.amount);
      if (tx.type === 'income' || tx.type === 'transfer_in') delta = amt;
      else if (tx.type === 'expense' || tx.type === 'transfer_out' || tx.type === 'loan') delta = -amt;
      return { ...tx, delta, dateObj: new Date(tx.date) };
    });

    const getDataForPeriod = (periodEnd: Date, periodStart: Date) => {
      // Balance at end
      const futureTxs = txsWithDelta.filter(t => t.dateObj > periodEnd);
      const diff = futureTxs.reduce((sum, t) => sum + t.delta, 0);
      const balanceAtEnd = currentBalance - diff;

      // Flows within period
      const periodTxs = txsWithDelta.filter(t => t.dateObj >= periodStart && t.dateObj <= periodEnd);
      const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
      const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? -t.delta : 0), 0);

      return { balance: balanceAtEnd, income, expense };
    };

    const points: any[] = [];

    // Sort selected years strictly ascending for chart continuity
    const sortedSelectedYears = [...selectedYears].sort((a, b) => Number(a) - Number(b));

    sortedSelectedYears.forEach(yearStr => {
      const y = parseInt(yearStr);

      if (selectedMonth === 'all') {
        for (let m = 0; m < 12; m++) {
          const start = new Date(y, m, 1, 0, 0, 0);
          const end = new Date(y, m + 1, 0, 23, 59, 59);

          const point: any = {
            name: format(new Date(y, m, 1), 'MMM', { locale: es }),
            monthIndex: m,
            year: y,
            // Unique key for recharts if needed, but name is usually XAxis
            // If multiple years have same month name 'Ene', we might want unique XAxis labels like 'Ene 23'
            displayName: sortedSelectedYears.length > 1
              ? `${format(new Date(y, m, 1), 'MMM', { locale: es })} '${y.toString().slice(2)}`
              : format(new Date(y, m, 1), 'MMM', { locale: es })
          };

          const d = getDataForPeriod(end, start);
          point.balance = d.balance;
          point.income = d.income;
          point.expense = d.expense;
          point.fullDate = start;

          points.push(point);
        }
      } else {
        const m = parseInt(selectedMonth) - 1;
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const start = new Date(y, m, d, 0, 0, 0);
          const end = new Date(y, m, d, 23, 59, 59);
          const point: any = {
            name: `${d}`,
            year: y,
            displayName: sortedSelectedYears.length > 1
              ? `${d}/${m + 1}/${y.toString().slice(2)}`
              : `${d}`
          };

          const dat = getDataForPeriod(end, start);
          point.balance = dat.balance;
          point.income = dat.income;
          point.expense = dat.expense;
          point.fullDate = start;

          points.push(point);
        }
      }
    });

    // Post-process: Cut balance line after last record (Strict "no future balance line")
    let lastActiveIndex = -1;
    points.forEach((p, i) => {
      if (p.income !== 0 || p.expense !== 0) lastActiveIndex = i;
    });

    if (lastActiveIndex !== -1) {
      for (let i = lastActiveIndex + 1; i < points.length; i++) {
        points[i].balance = null;
      }
    } else {
      points.forEach(p => p.balance = null);
    }

    return points;
  }, [transactions, selectedYears, selectedMonth, currentBalance, currentYear]);

  // --- Helpers ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: currency || 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val);

  const formatLargeCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val}`;
  };

  // Calculate dynamic domain from data
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) return [0, 1000000];

    const allValues: number[] = [];
    chartData.forEach(d => {
      if (d.income != null) allValues.push(d.income);
      if (d.expense != null) allValues.push(d.expense);
      if (d.balance != null) allValues.push(d.balance);
    });

    if (allValues.length === 0) return [0, 1000000];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Evolución Histórica</h3>
          <p className="text-sm text-muted-foreground">Comportamiento de ingresos, gastos y balance neto</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50 mr-2">
            <Button
              variant={showIncome ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowIncome(!showIncome)}
              className={cn("h-7 text-xs gap-1.5", showIncome && "bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 border border-emerald-200")}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-xs gap-1.5", showExpense && "bg-rose-100/50 text-rose-700 hover:bg-rose-200/50 border border-rose-200")}
            >
              {showExpense && <Check className="h-3 w-3" />} Gastos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-xs gap-1.5", showBalance && "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20")}
            >
              {showBalance && <Check className="h-3 w-3" />} Balance
            </Button>
          </div>

          <Select value={selectedMonth} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px] h-9 bg-background/50 border-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 bg-background/50 border-input gap-2">
                {selectedYears.length === availableYears.length ? 'Todos' : `${selectedYears.length} Años`}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Seleccionar Años</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onSelectAllYears && (
                <>
                  <DropdownMenuCheckboxItem
                    checked={selectedYears.length === availableYears.length}
                    onCheckedChange={onSelectAllYears}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {availableYears.map(year => (
                <DropdownMenuCheckboxItem
                  key={year}
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => toggleYear(year)}
                >
                  {year}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[350px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="displayName"
              axisLine={false}
              tickLine={false}
              tick={(props) => {
                const { x, y, payload } = props;
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                let label = payload.value;
                if (isMobile && selectedMonth === 'all' && label) {
                  // For monthly view on mobile, show first letter only
                  label = label.charAt(0);
                }
                return (
                  <text
                    x={x}
                    y={y}
                    dy={10}
                    textAnchor="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={12}
                  >
                    {label}
                  </text>
                );
              }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tickFormatter={formatLargeCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={60}
              domain={yDomain}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '8px' }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />

            {showIncome && (
              <Bar
                dataKey="income"
                name="Ingresos"
                fill="hsl(var(--success))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                fillOpacity={0.7}
              />
            )}
            {showExpense && (
              <Bar
                dataKey="expense"
                name="Gastos"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                fillOpacity={0.7}
              />
            )}
            {showBalance && (
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}




