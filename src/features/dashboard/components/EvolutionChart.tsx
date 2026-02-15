import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn, formatCurrencyCompact } from '@/core/utils';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { FinanceChartTooltip } from '@/shared/components/charts/FinanceChartTooltip';
import { excludeTransfers } from '@/lib/cashflowUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Button } from '@/shared/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
}

interface EvolutionChartPoint {
  name: string;
  monthIndex?: number;
  year: number;
  displayName: string;
  balance: number | null;
  income: number;
  expense: number;
  fullDate: Date;
}

interface AxisTickProps {
  x: number;
  y: number;
  payload: { value: string };
}

interface EvolutionChartProps {
  transactions: Transaction[];
  selectedYears: string[];
  onSelectedYearsChange: (years: string[]) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  onSelectAllYears?: () => void;
}

export function EvolutionChart({
  transactions,
  selectedYears,
  onSelectedYearsChange,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
  onSelectAllYears,
}: EvolutionChartProps) {
  const { currency } = useFormatCurrency();
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

  useEffect(() => { if (controlledMonth) {setInternalMonth(controlledMonth);} }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const toggleYear = (year: string) => {
    const newSelection = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];

    // Prevent empty selection? 
    if (newSelection.length === 0) {return;}

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
    if (transactions.length === 0) {return [];}

    const baseTransactions = excludeTransfers(transactions)
      .filter(tx => !(tx.type === 'expense' && (tx.installments || 1) > 1));

    if (baseTransactions.length === 0) {return [];}

    // Process deltas (solo transacciones reales, sin anclaje a saldo real)
    const txsWithDelta = baseTransactions.map(tx => {
      let delta = 0;
      const amt = Number(tx.amount);
      if (tx.type === 'income' || tx.type === 'transfer_in') {delta = amt;}
      else if (tx.type === 'expense' || tx.type === 'transfer_out' || tx.type === 'loan') {delta = -amt;}
      return { ...tx, delta, dateObj: new Date(tx.date) };
    });

    const points: EvolutionChartPoint[] = [];
    let runningBalance = 0;

    // Sort selected years strictly ascending for chart continuity
    const sortedSelectedYears = [...selectedYears].sort((a, b) => Number(a) - Number(b));

    sortedSelectedYears.forEach(yearStr => {
      const y = parseInt(yearStr);

      if (selectedMonth === 'all') {
        for (let m = 0; m < 12; m++) {
          const start = new Date(y, m, 1, 0, 0, 0);
          const end = new Date(y, m + 1, 0, 23, 59, 59);

          const periodTxs = txsWithDelta.filter(t => t.dateObj >= start && t.dateObj <= end);
          const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
          const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? -t.delta : 0), 0);
          runningBalance += income - expense;

          const point: EvolutionChartPoint = {
            name: format(new Date(y, m, 1), 'MMM', { locale: es }),
            monthIndex: m,
            year: y,
            // Unique key for recharts if needed, but name is usually XAxis
            // If multiple years have same month name 'Ene', we might want unique XAxis labels like 'Ene 23'
            displayName: sortedSelectedYears.length > 1
              ? `${format(new Date(y, m, 1), 'MMM', { locale: es })} '${y.toString().slice(2)}`
              : format(new Date(y, m, 1), 'MMM', { locale: es })
          };

          point.balance = runningBalance;
          point.income = income;
          point.expense = expense;
          point.fullDate = start;

          points.push(point);
        }
      } else {
        const m = parseInt(selectedMonth) - 1;
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const start = new Date(y, m, d, 0, 0, 0);
          const end = new Date(y, m, d, 23, 59, 59);
          const periodTxs = txsWithDelta.filter(t => t.dateObj >= start && t.dateObj <= end);
          const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
          const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? -t.delta : 0), 0);
          runningBalance += income - expense;

          const point: EvolutionChartPoint = {
            name: `${d}`,
            year: y,
            displayName: sortedSelectedYears.length > 1
              ? `${d}/${m + 1}/${y.toString().slice(2)}`
              : `${d}`
          };

          point.balance = runningBalance;
          point.income = income;
          point.expense = expense;
          point.fullDate = start;

          points.push(point);
        }
      }
    });

    // Post-process: Cut balance line after last record (Strict "no future balance line")
    let lastActiveIndex = -1;
    points.forEach((p, i) => {
      if (p.income !== 0 || p.expense !== 0) {lastActiveIndex = i;}
    });

    if (lastActiveIndex !== -1) {
      for (let i = lastActiveIndex + 1; i < points.length; i++) {
        points[i].balance = null;
      }
    } else {
      points.forEach(p => p.balance = null);
    }

    return points;
  }, [transactions, selectedYears, selectedMonth, currentYear]);

  // --- Helpers ---
  const formatAxisCurrency = (val: number) => formatCurrencyCompact(val, currency || 'COP');

  // Calculate dynamic domain from data
  const yDomain = useMemo(() => {
    if (!chartData || chartData.length === 0) {return [0, 1000000];}

    const allValues: number[] = [];
    chartData.forEach(d => {
      if (d.income != null) {allValues.push(d.income);}
      if (d.expense != null) {allValues.push(d.expense);}
      if (d.balance != null) {allValues.push(d.balance);}
    });

    if (allValues.length === 0) {return [0, 1000000];}

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
              className={cn("h-7 text-xs gap-1.5 hover:text-current w-[90px] justify-center", showIncome && "bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 border border-emerald-200")}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-xs gap-1.5 hover:text-current w-[85px] justify-center", showExpense && "bg-rose-100/50 text-rose-700 hover:bg-rose-200/50 border border-rose-200")}
            >
              {showExpense && <Check className="h-3 w-3" />} Gastos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-xs gap-1.5 hover:text-current w-[85px] justify-center", showBalance && "bg-sky-100/70 text-sky-700 hover:bg-sky-200/50 border border-sky-200")}
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
            <defs>
              <linearGradient id="balanceHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
            <XAxis
              dataKey="displayName"
              axisLine={false}
              tickLine={false}
              tick={(props: AxisTickProps) => {
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
              tickFormatter={formatAxisCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={60}
              domain={yDomain}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
              content={<FinanceChartTooltip />}
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
              <Area
                type="monotone"
                dataKey="balance"
                name="Balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#balanceHistoryGradient)"
                fillOpacity={1}
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




