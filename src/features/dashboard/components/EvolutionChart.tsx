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
  selectedYear?: string;
  onSelectedYearChange?: (year: string) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  currentBalance?: number;
}

export function EvolutionChart({
  transactions,
  selectedYear: controlledYear,
  onSelectedYearChange,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
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
  const [internalYear, setInternalYear] = useState<string>(() => years[0] || String(currentYear));

  const selectedMonth = controlledMonth ?? internalMonth;
  const selectedYear = controlledYear ?? internalYear;

  useEffect(() => { if (controlledYear) setInternalYear(controlledYear); }, [controlledYear]);
  useEffect(() => { if (controlledMonth) setInternalMonth(controlledMonth); }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const setYear = (value: string) => {
    setInternalYear(value);
    onSelectedYearChange?.(value);
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
    const y = parseInt(selectedYear);

    if (selectedMonth === 'all') {
      for (let m = 0; m < 12; m++) {
        const start = new Date(y, m, 1, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59);

        const point: any = {
          name: format(new Date(y, m, 1), 'MMM', { locale: es }),
          monthIndex: m
        };

        const d = getDataForPeriod(end, start);
        point.balance = d.balance;
        point.income = d.income;
        point.expense = d.expense;

        points.push(point);
      }
    } else {
      const m = parseInt(selectedMonth) - 1;
      const daysInMonth = new Date(y, m + 1, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const start = new Date(y, m, d, 0, 0, 0);
        const end = new Date(y, m, d, 23, 59, 59);
        const point: any = { name: `${d}` };

        const dat = getDataForPeriod(end, start);
        point.balance = dat.balance;
        point.income = dat.income;
        point.expense = dat.expense;

        points.push(point);
      }
    }

    // Post-process: Cut balance line after last record (Strict "no future balance line")
    // Find the last index that has ANY data (income OR expense).
    let lastActiveIndex = -1;
    points.forEach((p, i) => {
      if (p.income !== 0 || p.expense !== 0) lastActiveIndex = i;
    });

    // If we have data, cut everything after the last active point.
    // However, if the user has data in Feb but we are in Jan (weird case), or if data is sparse...
    // The user said: "se corta en el mes que hubo el ultimo registro".
    // This implies if I have data in Jan and Mar, but not Feb... well, "ultimo registro" implies the max date.
    // So if max date is Mar, Feb should show balance because it's *between*. 
    // BUT the request says "ultimo registro". So yes, after the MAX index, it should be null.
    // What about before? "se corta... para los meses que no hay registros" -> Wait.
    // "cortar... para los meses que no hay registros. Asegura que exista... cuando se filtra por mes".
    // "se corta en el mes que hubo el ultimo registro".
    // Interpretation: The line should exist UP TO the last record. After that, it should stop.

    if (lastActiveIndex !== -1) {
      for (let i = lastActiveIndex + 1; i < points.length; i++) {
        points[i].balance = null;
      }
    } else {
      // If absolutely no data in the view?
      // Maybe we just show the balance line? Or nothing?
      // If "no registros", usually balance is just flat.
      // But user complained about cutoff. Let's assume if no data, no line is safer to avoid confusion?
      // Or if it's the current period, show up to today.
      // Let's stick to "Null if no data found" to be safe.
      // Actually, if selectedMonth is 'all' and no data, user sees empty chart.
      points.forEach(p => p.balance = null);
    }

    return points;
  }, [transactions, selectedYear, selectedMonth, currentBalance, currentYear]);

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

          <Select value={selectedYear} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] h-9 bg-background/50 border-input"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[350px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              dy={10}
              interval={0}
              minTickGap={0}
            />
            <YAxis
              tickFormatter={formatLargeCurrency}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={60}
              domain={['auto', 'auto']}
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
