import { useState, useMemo, useEffect } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { cn, formatCurrencyCompact } from '@/core/utils';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { FinanceChartTooltip } from '@/shared/components/charts/FinanceChartTooltip';
import { excludeTransfers } from '@/lib/cashflowUtils';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Transaction, CategoryItem } from '@/features/finance/hooks/useFinanceData';
import { SankeyChart } from './SankeyChart';

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
  categories: CategoryItem[];
  selectedYears: string[];
  onSelectedYearsChange: (years: string[]) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (month: string) => void;
  onSelectAllYears?: () => void;
  sankeyDrillDown?: { type: 'income' | 'expense', page: number } | null;
  onSankeyDrillDownChange?: (drill: { type: 'income' | 'expense', page: number } | null) => void;
}

export function EvolutionChart({
  transactions,
  categories,
  selectedYears,
  onSelectedYearsChange,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
  onSelectAllYears,
  sankeyDrillDown,
  onSankeyDrillDownChange,
}: EvolutionChartProps) {
  const { currency } = useFormatCurrency();
  const currentYear = new Date().getFullYear();

  // --- Active tab ---
  const [activeTab, setActiveTab] = useState<'flow' | 'evolution'>('flow');

  // If a drill-down comes in from outside, switch to flow tab
  useEffect(() => {
    if (sankeyDrillDown) {
      setActiveTab('flow');
    }
  }, [sankeyDrillDown]);

  // --- Chart toggle filters (only relevant for evolution tab) ---
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

  useEffect(() => { if (controlledMonth) { setInternalMonth(controlledMonth); } }, [controlledMonth]);

  const setMonth = (value: string) => {
    setInternalMonth(value);
    onSelectedMonthChange?.(value);
  };

  const toggleYear = (year: string) => {
    const newSelection = selectedYears.includes(year)
      ? selectedYears.filter(y => y !== year)
      : [...selectedYears, year];
    if (newSelection.length === 0) { return; }
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
    if (transactions.length === 0) { return []; }

    const baseTransactions = excludeTransfers(transactions)
      .filter(tx => !(tx.type === 'expense' && (tx.installments || 1) > 1));

    if (baseTransactions.length === 0) { return []; }

    const txsWithDelta = baseTransactions.map(tx => {
      let delta = 0;
      const amt = Number(tx.amount);
      if (tx.type === 'income') { delta = amt; }
      else if (tx.type === 'expense' || tx.type === 'loan') { delta = -amt; }
      return { ...tx, delta, dateObj: new Date(tx.date) };
    });

    const points: EvolutionChartPoint[] = [];
    let runningBalance = 0;

    const sortedSelectedYears = [...selectedYears].sort((a, b) => Number(a) - Number(b));

    sortedSelectedYears.forEach(yearStr => {
      const y = parseInt(yearStr);

      if (selectedMonth === 'all') {
        for (let m = 0; m < 12; m++) {
          const start = new Date(y, m, 1, 0, 0, 0);
          const end = new Date(y, m + 1, 0, 23, 59, 59);

          const periodTxs = txsWithDelta.filter(t => t.dateObj >= start && t.dateObj <= end);
          const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
          const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? t.delta : 0), 0);
          runningBalance += income + expense;

          points.push({
            name: format(new Date(y, m, 1), 'MMM', { locale: es }),
            monthIndex: m,
            year: y,
            displayName: sortedSelectedYears.length > 1
              ? `${format(new Date(y, m, 1), 'MMM', { locale: es })} '${y.toString().slice(2)}`
              : format(new Date(y, m, 1), 'MMM', { locale: es }),
            balance: runningBalance,
            income,
            expense,
            fullDate: start
          });
        }
      } else {
        const m = parseInt(selectedMonth) - 1;
        const daysInMonth = new Date(y, m + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const start = new Date(y, m, d, 0, 0, 0);
          const end = new Date(y, m, d, 23, 59, 59);
          const periodTxs = txsWithDelta.filter(t => t.dateObj >= start && t.dateObj <= end);
          const income = periodTxs.reduce((sum, t) => sum + (t.delta > 0 ? t.delta : 0), 0);
          const expense = periodTxs.reduce((sum, t) => sum + (t.delta < 0 ? t.delta : 0), 0);
          runningBalance += income + expense;

          points.push({
            name: `${d}`,
            year: y,
            displayName: sortedSelectedYears.length > 1
              ? `${d}/${m + 1}/${y.toString().slice(2)}`
              : `${d}`,
            balance: runningBalance,
            income,
            expense,
            fullDate: start
          });
        }
      }
    });

    let lastActiveIndex = -1;
    points.forEach((p, i) => {
      if (p.income !== 0 || p.expense !== 0) { lastActiveIndex = i; }
    });

    if (lastActiveIndex !== -1) {
      for (let i = lastActiveIndex + 1; i < points.length; i++) {
        points[i].balance = null;
      }
    } else {
      points.forEach(p => p.balance = null);
    }

    return points;
  }, [transactions, selectedYears, selectedMonth]);

  // --- Helpers ---
  const formatAxisCurrency = (val: number) => formatCurrencyCompact(val, currency || 'COP');

  const { yDomain, yTicks } = useMemo(() => {
    const fallback = { yDomain: [-1000000, 1000000] as [number, number], yTicks: [-1000000, -666667, -333333, 0, 333333, 666667, 1000000] };
    if (!chartData || chartData.length === 0) {
      return fallback;
    }

    const allValues: number[] = [];
    chartData.forEach(d => {
      if (d.income !== null) {
        allValues.push(d.income);
      }
      if (d.expense !== null) {
        allValues.push(d.expense);
      }
      if (d.balance !== null) {
        allValues.push(d.balance);
      }
    });

    if (allValues.length === 0) {
      return fallback;
    }

    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues, 0);

    const rawRange = maxVal - minVal;
    const rawStep = rawRange / 6 || 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const firstDigit = rawStep / magnitude;
    let step = magnitude;
    if (firstDigit > 5) {
      step = 10 * magnitude;
    } else if (firstDigit > 2) {
      step = 5 * magnitude;
    } else if (firstDigit > 1) {
      step = 2 * magnitude;
    }

    const stepsBelow = minVal < 0 ? Math.ceil(Math.abs(minVal) / step) : 0;
    const stepsAbove = maxVal > 0 ? Math.ceil(maxVal / step) : 0;

    let kBelow = stepsBelow;
    const total = stepsBelow + stepsAbove;

    if (total > 6) {
      const ratio = Math.abs(minVal) / (Math.abs(minVal) + maxVal);
      kBelow = Math.round(ratio * 6);
      const kAbove = 6 - kBelow;
      const s = Math.max(
        kBelow > 0 ? Math.ceil(Math.abs(minVal) / kBelow) : 0,
        kAbove > 0 ? Math.ceil(maxVal / kAbove) : 0
      );
      const m = Math.pow(10, Math.floor(Math.log10(s || 1)));
      const f = s / m;
      step = m * (f > 5 ? 10 : f > 2 ? 5 : f > 1 ? 2 : 1);
    } else {
      const extra = 6 - total;
      kBelow = stepsBelow + Math.floor(extra / 2);
    }

    const start = -kBelow * step;
    const ticks: number[] = [];
    for (let i = 0; i <= 6; i++) {
      ticks.push(start + i * step);
    }

    return {
      yDomain: [ticks[0] - step * 0.5, ticks[6] + step * 0.5] as [number, number],
      yTicks: ticks
    };
  }, [chartData]);

  // Filtered transactions for Sankey (respects year + month filters)
  const filteredSankeyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      const yearStr = d.getFullYear().toString();
      if (!selectedYears.includes(yearStr)) {
        return false;
      }
      if (selectedMonth !== 'all') {
        if (d.getMonth() + 1 !== Number(selectedMonth)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedYears, selectedMonth]);

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'flow' | 'evolution')} className="h-full flex flex-col">
      <Card className="shadow-sm border-border/50 bg-slate-50/50 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-2">
          {/* ROW 1: Tabs — always centered */}
          <div className="flex justify-center mb-3">
            <TabsList className="h-9 bg-muted/30 border border-border/50 p-1 rounded-lg">
              <TabsTrigger
                value="flow"
                className="h-7 text-[10px] md:text-xs min-w-[100px] px-3 rounded-lg font-medium transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-background data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60"
              >
                Flujo de dinero
              </TabsTrigger>
              <TabsTrigger
                value="evolution"
                className="h-7 text-[10px] md:text-xs min-w-[120px] px-3 rounded-lg font-medium transition-colors text-slate-600 hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-background data-[state=active]:text-slate-800 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/60"
              >
                Evolución histórica
              </TabsTrigger>
            </TabsList>
          </div>
          {/* ROW 2: Controls — right aligned */}
          <div className={cn(
            "flex items-center gap-2 flex-wrap transition-all duration-300 w-full",
            activeTab === 'flow' ? "justify-center" : "justify-end"
          )}>
            {activeTab === 'evolution' && (
              <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50 mr-2 order-2 md:order-1 flex-shrink-0 animate-in fade-in zoom-in-95 duration-200">
                <button
                  type="button"
                  onClick={() => setShowIncome(!showIncome)}
                  className={cn(
                    "h-7 text-[10px] md:text-xs min-w-[68px] px-2 rounded-lg shrink-0 font-medium transition-colors",
                    showIncome
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpense(!showExpense)}
                  className={cn(
                    "h-7 text-[10px] md:text-xs min-w-[68px] px-2 rounded-lg shrink-0 font-medium transition-colors",
                    showExpense
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  Gastos
                </button>
                <button
                  type="button"
                  onClick={() => setShowBalance(!showBalance)}
                  className={cn(
                    "h-7 text-[10px] md:text-xs min-w-[68px] px-2 rounded-lg shrink-0 font-medium transition-colors",
                    showBalance
                      ? "bg-slate-200 text-slate-700 border border-slate-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  Balance
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 flex-shrink-0 order-1 md:order-2">
              <Select value={selectedMonth} onValueChange={setMonth}>
                <SelectTrigger className="w-auto min-w-[130px] h-9 bg-background/50 border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 bg-background/50 border-input gap-2 whitespace-nowrap">
                    {selectedYears.length === availableYears.length ? 'Todos los años' : `${selectedYears.length} Años`}
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
        </CardHeader>

        <CardContent className="flex-1 p-4 pt-2 min-h-[400px]">
          {/* ── TAB 1: FLUJO (Sankey) ── */}
          <TabsContent value="flow" className="mt-0 h-full min-h-[420px]">
            <SankeyChart
              transactions={filteredSankeyTransactions}
              categories={categories}
              drillDown={sankeyDrillDown}
              onDrillDownChange={onSankeyDrillDownChange}
            />
          </TabsContent>

          {/* ── TAB 2: EVOLUCIÓN ── */}
          <TabsContent value="evolution" className="mt-0 h-full min-h-[420px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={420}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>

                {yTicks.map(tick => (
                  <ReferenceLine key={tick} y={tick} stroke="hsl(var(--border))" strokeOpacity={0.35} strokeWidth={1} />
                ))}
                <XAxis
                  dataKey="displayName"
                  axisLine={false}
                  tickLine={false}
                  padding={{ left: 20, right: 0 }}
                  tick={(props: AxisTickProps) => {
                    const { x, y, payload } = props;
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const label = payload.value as string;
                    let monthStr = label;
                    let yearStr = '';

                    const isMultiYear = selectedYears.length > 1;

                    if (isMultiYear && selectedMonth === 'all' && label.includes(" '")) {
                      const parts = label.split(" '");
                      monthStr = parts[0];
                      yearStr = parts[1] ? `'${parts[1]}` : '';
                    }

                    if (isMultiYear && selectedMonth === 'all') {
                      const dataPoint = chartData.find(d => d.displayName === label);
                      if (dataPoint && dataPoint.monthIndex !== 0 && dataPoint.monthIndex !== 6) {
                        return null;
                      }
                    }

                    if (!isMultiYear && selectedMonth === 'all') {
                      const dataPoint = chartData.find(d => d.displayName === label);
                      const visibleMonths = [0, 3, 6, 9, 11];
                      if (dataPoint && !visibleMonths.includes(dataPoint.monthIndex ?? -1)) {
                        return null;
                      }
                    }

                    if (isMobile && selectedMonth === 'all' && !isMultiYear) {
                      monthStr = monthStr.charAt(0);
                    }

                    return (
                      <text x={x} y={y} dy={12} textAnchor="middle" fill="#475569" fontSize={11} fontWeight={500}>
                        <tspan x={x} dy="0">{monthStr}</tspan>
                        {yearStr && <tspan x={x} dy="14">{yearStr}</tspan>}
                      </text>
                    );
                  }}
                  interval={0}
                />
                <YAxis
                  tickFormatter={formatAxisCurrency}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  width={60}
                  domain={yDomain}
                  ticks={yTicks}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                  content={<FinanceChartTooltip />}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700 ml-1">{value}</span>
                  )}
                />

                {/* Fixed barSize + fillOpacity keeps each bar in its own slot always */}
                <Bar
                  dataKey="income"
                  name="Ingresos"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  fillOpacity={showIncome ? 0.7 : 0}
                  isAnimationActive={false}
                  legendType={showIncome ? 'circle' : 'none'}
                />
                <Bar
                  dataKey="expense"
                  name="Gastos"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                  barSize={14}
                  fillOpacity={showExpense ? 0.7 : 0}
                  isAnimationActive={false}
                  legendType={showExpense ? 'circle' : 'none'}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                {showBalance && (
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="#94a3b8"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={(props: { cx: number; cy: number; payload: EvolutionChartPoint; index: number }) => {
                      const { cx, cy, payload } = props;
                      if (payload.balance === null) {
                        return <g key={`dot-${payload.displayName}`} />;
                      }
                      const isMultiYear = selectedYears.length > 1;
                      const monthIdx = payload.monthIndex ?? -1;
                      const isVisible = selectedMonth !== 'all'
                        ? true
                        : isMultiYear
                          ? monthIdx === 0 || monthIdx === 6
                          : [0, 3, 6, 9, 11].includes(monthIdx);
                      if (!isVisible) {
                        return <g key={`dot-${payload.displayName}`} />;
                      }
                      return (
                        <circle
                          key={`dot-${payload.displayName}`}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="#94a3b8"
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    connectNulls={false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#94a3b8' }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
}
