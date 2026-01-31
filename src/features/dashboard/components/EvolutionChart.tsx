import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useDecimalPlaces } from '@/hooks/useDecimalPlaces';
import { useFinance } from '@/contexts/FinanceContext';
import { CURRENCIES } from '@/hooks/currencyConstants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { ChevronDown, Filter, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  selectedYears?: string[];
  onSelectedYearsChange?: (years: string[]) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  onSelectAllYears?: () => void;
  currentBalance?: number; // Needed for accurate back-calculation
}

export function EvolutionChart({
  transactions,
  selectedYears: controlledYears,
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
  const years = useMemo(() => {
    const uniqueYears = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    uniqueYears.add(currentYear);
    return Array.from(uniqueYears).sort((a, b) => b - a).map(String);
  }, [transactions, currentYear]);

  const [internalMonth, setInternalMonth] = useState<string>('all');
  const [internalYears, setInternalYears] = useState<string[]>(() => years.length ? [years[0]] : [String(currentYear)]);

  const selectedMonth = controlledMonth ?? internalMonth;
  const selectedYears = controlledYears ?? internalYears;

  useEffect(() => { if (controlledYears) setInternalYears(controlledYears); }, [controlledYears]);
  useEffect(() => { if (controlledMonth) setInternalMonth(controlledMonth); }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const setYears = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === 'function' ? updater(selectedYears) : updater;
    const normalized = next.length === 0 ? [years[0] || String(currentYear)] : next;
    setInternalYears(normalized);
    onSelectedYearsChange?.(normalized);
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

  // --- Data Processing (Back-Calculation) ---
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // 1. Sort transactions descending (newest first)
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Map full daily history backwards
    // We Map: Key=YYYY-MM-DD, Value={ balance: number, income: 0, expense: 0 }
    const historyMap = new Map<string, { balance: number, income: number, expense: number }>();

    let runningBalance = currentBalance;

    // We need to account for date gaps. We'll start from "Today" (or last transaction date) and go back to first transaction.
    // Actually, simpler: Iterate transactions.
    // For day D, Balance(end) = runningBalance.
    // Balance(start) = Balance(end) - Income + Expense.
    // Next iteration (D-1) starts with Balance(start).

    // BUT we need generic timeline, not just transaction days.
    // Let's create a bucketed map by period (Month or Day)

    // Group transactions by date Key
    const txByDate = new Map<string, Transaction[]>();
    sortedTxs.forEach(tx => {
      // If yearly view, key is YYYY-MM. If monthly view, key is YYYY-MM-DD.
      // To be safe and support zoom later, let's keep daily precision internally.
      const key = tx.date.split('T')[0];
      if (!txByDate.has(key)) txByDate.set(key, []);
      txByDate.get(key)!.push(tx);
    });

    // Find range
    const now = new Date();
    // Use the earliest selected year
    const minYear = Math.min(...selectedYears.map(Number));
    const startObj = new Date(minYear, 0, 1);
    const endObj = new Date(Math.max(...selectedYears.map(Number)), 11, 31);

    // Wait, back-calculation must start from NOW and go back to minYear.
    // If there are gaps between NOW and MaxYear, we assume balance stays same.

    const dailyData: Record<string, any>[] = [];

    let currentDate = new Date(); // Start from today for back-calc
    // Align current Date to end of day?
    currentDate.setHours(23, 59, 59, 999);

    // We assume currentBalance is the balance AFTER all transactions up to now.
    // We iterate backwards day by day until we cover all selected years?
    // That's expensive if range is huge.
    // Optimization: Calculate monthly snapshots.
    // But we need daily if selectedMonth != 'all'.

    // Let's stick to "Process all transactions to build a daily balance map first"
    // Actually, simpler: just process transactions from newest to oldest.

    const balanceByDay = new Map<string, number>();
    // Pre-seed today
    balanceByDay.set(format(now, 'yyyy-MM-dd'), runningBalance);

    sortedTxs.forEach(tx => {
      const txDate = tx.date.split('T')[0];
      const amount = Number(tx.amount);

      // Reverse operation to get balance BEFORE transaction
      if (tx.type === 'income' || tx.type === 'transfer_in') {
        runningBalance -= amount;
      } else if (tx.type === 'expense' || tx.type === 'transfer_out' || tx.type === 'loan') {
        runningBalance += amount;
      }

      // This runningBalance is the balance at start of tx. Or end of previous tx?
      // Let's refine:
      // Balance at End of Day D is recorded.
      // Balance at End of Day D-1 = Balance End Day D - (IncomeD - ExpenseD).
    });

    // RETHINK: We need balance at specific points.
    // Let's compute forward from "Initial Balance"? No, we don't know it.
    // Stick to backward.

    // Better strategy for CHART DATA construction:
    // 1. Identify all periods we need to render.
    //    - If Month=All: 12 months for each selected year. (Keys: YYYY-MM)
    //    - If Month=X: ~30 days for each selected year. (Keys: YYYY-MM-DD)

    // 2. Calculate balance at the END of each period.
    //    Balance(End of Period P) = currentBalance - (Sum of (Inc-Exp) from Now down to End of Period P)

    // Let's compute Cumulative Delta from Now.
    // Delta(t) = amount signed (Income +, Expense -)
    // We sum all deltas for txs where date > PeriodEnd.
    // Balance(PeriodEnd) = currentBalance - SumDelta(date > P_End)

    // Pre-calculate deltas for all transactions
    const txsWithDelta = sortedTxs.map(tx => {
      let delta = 0;
      const amt = Number(tx.amount);
      if (tx.type === 'income' || tx.type === 'transfer_in') delta = amt;
      else if (tx.type === 'expense' || tx.type === 'transfer_out' || tx.type === 'loan') delta = -amt;

      // Also buckets for bars
      return { ...tx, delta, dateObj: new Date(tx.date) };
    });

    const getDataForPeriod = (label: string, periodEnd: Date, periodStart: Date) => {
      // 1. Balance at End
      // Sum deltas of all txs occurring AFTER this period
      const futureTxs = txsWithDelta.filter(t => t.dateObj > periodEnd);
      const diff = futureTxs.reduce((sum, t) => sum + t.delta, 0);
      const balanceAtEnd = currentBalance - diff;

      // 2. Flows WITHIN period
      const periodTxs = txsWithDelta.filter(t => t.dateObj >= periodStart && t.dateObj <= periodEnd);
      const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
      const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? -t.delta : 0), 0);

      return { balance: balanceAtEnd, income, expense };
    };

    // GENERATE DATA POINTS
    const points: any[] = [];

    if (selectedMonth === 'all') {
      // 12 Months
      for (let m = 0; m < 12; m++) {
        const point: any = { name: format(new Date(2023, m, 1), 'MMM', { locale: es }) };

        selectedYears.forEach(year => {
          const y = parseInt(year);
          const start = new Date(y, m, 1, 0, 0, 0);
          const end = new Date(y, m + 1, 0, 23, 59, 59); // Last day of month

          // Don't predict future if year is current year and month > current month
          if (y === currentYear && m > new Date().getMonth()) {
            point[`balance_${year}`] = null;
            point[`income_${year}`] = null;
            point[`expense_${year}`] = null;
          } else {
            const d = getDataForPeriod(year, end, start);
            point[`balance_${year}`] = d.balance;
            point[`income_${year}`] = d.income;
            point[`expense_${year}`] = d.expense;
          }
        });
        points.push(point);
      }
    } else {
      // Daily for specific month
      const m = parseInt(selectedMonth) - 1;
      // Days in month (use first selected year as ref, leap year edge case handled approximately or strictly?)
      // Strictly:
      const maxDays = 31; // Just iterate 1..31 and hide invalid

      for (let d = 1; d <= 31; d++) {
        const point: any = { name: `${d}` };
        let hasData = false;

        selectedYears.forEach(year => {
          const y = parseInt(year);
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          if (d > daysInMonth) return;
          hasData = true;

          const start = new Date(y, m, d, 0, 0, 0);
          const end = new Date(y, m, d, 23, 59, 59);

          // Future check
          if (start > new Date()) {
            point[`balance_${year}`] = null;
          } else {
            const dat = getDataForPeriod(year, end, start);
            point[`balance_${year}`] = dat.balance;
            point[`income_${year}`] = dat.income;
            point[`expense_${year}`] = dat.expense;
          }
        });

        if (hasData) points.push(point);
      }
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

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Evolución Histórica</h3>
          <p className="text-sm text-muted-foreground">Comportamiento de ingresos, gastos y balance neto</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggles */}
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50 mr-2">
            <Button
              variant={showIncome ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowIncome(!showIncome)}
              className={cn("h-7 text-xs gap-1.5", showIncome && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-xs gap-1.5", showExpense && "bg-rose-100 text-rose-700 hover:bg-rose-200")}
            >
              {showExpense && <Check className="h-3 w-3" />} Gastos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-xs gap-1.5", showBalance && "bg-primary/15 text-primary hover:bg-primary/25")}
            >
              {showBalance && <Check className="h-3 w-3" />} Balance
            </Button>
          </div>

          {/* Month/Year Selectors (Existing Logic) */}
          <Select value={selectedMonth} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px] h-9 bg-background/50 border-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/50 border-input">
                {selectedYears.length > 1 ? 'Años' : selectedYears[0]} <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Años visibles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={selectedYears.length === years.length}
                onCheckedChange={() => onSelectAllYears ? onSelectAllYears() : setYears([...years])}
              >
                Ver todos
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {years.map(y => (
                <DropdownMenuCheckboxItem
                  key={y}
                  checked={selectedYears.includes(y)}
                  onCheckedChange={() => {
                    const newSet = selectedYears.includes(y) ? selectedYears.filter(x => x !== y) : [...selectedYears, y];
                    setYears(newSet);
                  }}
                >
                  {y}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[350px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
            />
            <YAxis
              tickFormatter={formatLargeCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
              contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              labelStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '8px' }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px' }} />

            {selectedYears.flatMap((year, i) => {
              // Opacity logic if multiple years
              const isCurrent = year === String(currentYear);
              const opacity = selectedYears.length > 1 && !isCurrent ? 0.6 : 1;
              const yearColor = COLORS[i % COLORS.length];

              return [
                showBalance && (
                  <Line
                    key={`bal-${year}`}
                    type="monotone"
                    dataKey={`balance_${year}`}
                    name={`Balance ${year}`}
                    stroke={yearColor}
                    strokeWidth={3}
                    dot={false}
                    strokeOpacity={opacity}
                    activeDot={{ r: 6, strokeWidth: 0, fill: yearColor }}
                  />
                ),
                showIncome && (
                  <Bar
                    key={`inc-${year}`}
                    dataKey={`income_${year}`}
                    name={`Ingresos ${year}`}
                    fill="hsl(var(--success))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    fillOpacity={opacity * 0.7}
                  />
                ),
                showExpense && (
                  <Bar
                    key={`exp-${year}`}
                    dataKey={`expense_${year}`}
                    name={`Gastos ${year}`}
                    fill="hsl(var(--destructive))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    fillOpacity={opacity * 0.7}
                  />
                )
              ];
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
