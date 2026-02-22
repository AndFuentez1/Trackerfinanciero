import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { Check } from 'lucide-react';
import { cn, formatCurrencyCompact } from '@/core/utils';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { FinanceChartTooltip } from '@/shared/components/charts/FinanceChartTooltip';
import type { CashFlowChartPoint } from '@/features/finance/cashflow/types/cashflowTypes';

interface CashFlowChartProps {
  data: CashFlowChartPoint[];
  loading?: boolean;
  isWarning?: boolean;
}

interface BalanceAdjustmentLabelProps {
  x?: number;
  y?: number;
  payload?: CashFlowChartPoint;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, loading, isWarning }) => {
  const { formatCurrency, currency } = useFormatCurrency();
  const axisFormatter = useMemo(() => {
    return (value: number) => formatCurrencyCompact(value, currency || 'COP');
  }, [currency]);

  const renderBalanceAdjustmentLabel = ({ x, y, payload }: BalanceAdjustmentLabelProps) => {
    if (typeof x !== 'number' || typeof y !== 'number') { return null; }
    const delta = payload?.balanceAjusteDelta;
    if (typeof delta !== 'number' || delta === 0) { return null; }
    return (
      <text
        x={x}
        y={y - 12}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={10}
      >
        {`Ajuste de Balance Inicial ${formatCurrency(delta)}`}
      </text>
    );
  };

  // Calculate dynamic domain from data ensuring 7 even grid lines
  const { yDomain, yTicks } = React.useMemo(() => {
    const fallback = { yDomain: [-1000000, 1000000] as [number, number], yTicks: [-1000000, -666667, -333333, 0, 333333, 666667, 1000000] };
    if (!data || data.length === 0) return fallback;

    const allValues: number[] = [];
    data.forEach(d => {
      if (d.ingresos != null) allValues.push(d.ingresos);
      if (d.egresos != null) allValues.push(-Math.abs(d.egresos));
      if (d.balanceReal != null) allValues.push(d.balanceReal);
      if (d.balanceProyectado != null) allValues.push(d.balanceProyectado);
      if (d.balanceSimulated != null) allValues.push(d.balanceSimulated);
    });

    if (allValues.length === 0) return fallback;

    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues, 0);

    // Nice step calculation
    const rawRange = maxVal - minVal;
    const rawStep = rawRange / 6 || 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const firstDigit = rawStep / magnitude;
    let step = magnitude;
    if (firstDigit > 5) step = 10 * magnitude;
    else if (firstDigit > 2) step = 5 * magnitude;
    else if (firstDigit > 1) step = 2 * magnitude;

    // Distribute 6 intervals around zero
    const stepsBelow = minVal < 0 ? Math.ceil(Math.abs(minVal) / step) : 0;
    const stepsAbove = maxVal > 0 ? Math.ceil(maxVal / step) : 0;

    let kBelow = stepsBelow;
    let total = stepsBelow + stepsAbove;

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
  }, [data]);

  // Filter States
  const [showIncome, setShowIncome] = useState(false); // Default off to be clean
  const [showExpense, setShowExpense] = useState(false);
  const [showBalance, setShowBalance] = useState(true); // Default on

  if (loading) {
    return (
      <Card className="mb-6 shadow-sm border-border/50 bg-slate-50/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  // Pre-process data to make expenses negative for downward bars
  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      negativeEgresos: d.egresos != null ? -Math.abs(d.egresos) : null
    }));
  }, [data]);

  return (
    <Card className="mb-6 shadow-sm border-border/50 bg-slate-50/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Proyección de Flujo</CardTitle>
            <CardDescription>Estimación futura basada en presupuestos y obligaciones</CardDescription>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50 w-full md:w-auto flex-wrap sm:flex-nowrap gap-1">
            <Button
              variant={showIncome ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowIncome(!showIncome)}
              className={cn("h-7 text-[10.5px] sm:text-xs gap-1 sm:gap-1.5 transition-all hover:text-current flex-1 px-1 sm:px-3 sm:w-auto justify-center shrink-0", showIncome && "bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 border border-emerald-200")}
            >
              <span className="truncate">Ingresos</span>
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-[10.5px] sm:text-xs gap-1 sm:gap-1.5 transition-all hover:text-current flex-1 px-1 sm:px-3 sm:w-auto justify-center shrink-0", showExpense && "bg-rose-100/50 text-rose-700 hover:bg-rose-200/50 border border-rose-200")}
            >
              <span className="truncate">Egresos</span>
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-[10.5px] sm:text-xs gap-1 sm:gap-1.5 transition-all hover:text-current flex-1 px-1 sm:px-3 sm:w-auto justify-center shrink-0", showBalance && "bg-sky-100/70 text-sky-700 hover:bg-sky-200/50 border border-sky-200")}
            >
              <span className="truncate">Balance</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>

              </defs>
              {/* Líneas horizontales: una por tick visible del eje Y */}
              {yTicks.map(tick => (
                <ReferenceLine key={tick} y={tick} stroke="hsl(var(--border))" strokeOpacity={0.35} strokeWidth={1} />
              ))}
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                  const label = isMobile && payload.value ? payload.value.charAt(0) : payload.value;
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
                interval={0}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={axisFormatter}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={60}
                ticks={yTicks}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                content={<FinanceChartTooltip />}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />

              {/* Bars & Lines controlled by Toggles */}

              {showIncome && (
                <Bar
                  dataKey="ingresos"
                  name="Ingresos Totales"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
              )}

              {showExpense && (
                <Bar
                  dataKey="negativeEgresos"
                  name="Egresos Totales"
                  fill="hsl(var(--destructive))"
                  radius={[0, 0, 4, 4]}
                  maxBarSize={40}
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
              )}

              {showBalance && (
                <>
                  {/* Balance Real (Histórico Descriptivo) */}
                  <Line
                    type="monotone"
                    dataKey="balanceReal"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={(props: { cx: number; cy: number; payload: CashFlowChartPoint }) => {
                      const { cx, cy, payload } = props;
                      if (payload.balanceReal == null) return <g key={`dot-br-${payload.name}`} />;
                      return (
                        <circle
                          key={`dot-br-${payload.name}`}
                          cx={cx} cy={cy} r={3}
                          fill="hsl(var(--primary))"
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    connectNulls={false}
                    name="Balance Histórico"
                  />
                  {/* Vertical Jump Line explicitly drawn between Real and Proyectado on pivot month */}
                  {(() => {
                    const pivotData = chartData.find(d => d.balanceReal != null && d.balanceProyectado != null);
                    if (pivotData && pivotData.balanceReal !== pivotData.balanceProyectado) {
                      return (
                        <ReferenceLine
                          segment={[
                            { x: pivotData.name, y: pivotData.balanceReal },
                            { x: pivotData.name, y: pivotData.balanceProyectado }
                          ]}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          className="opacity-50"
                        />
                      );
                    }
                    return null;
                  })()}
                  {/* Balance Proyectado */}
                  <Line
                    type="monotone"
                    dataKey="balanceProyectado"
                    stroke={isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={2}
                    isAnimationActive={false}
                    dot={(props: { cx: number; cy: number; payload: CashFlowChartPoint }) => {
                      const { cx, cy, payload } = props;
                      if (payload.balanceProyectado == null) return <g key={`dot-bp-${payload.name}`} />;
                      const color = isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))";
                      return (
                        <circle
                          key={`dot-bp-${payload.name}`}
                          cx={cx} cy={cy} r={3}
                          fill={color}
                          stroke="hsl(var(--background))"
                          strokeWidth={1.5}
                        />
                      );
                    }}
                    strokeDasharray="5 5"
                    name={isWarning ? "Proyección (Con Pendientes)" : "Proyección"}
                    activeDot={{ r: 6, strokeWidth: 0, fill: isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
                    className={isWarning ? "opacity-90" : ""}
                  />
                  {/* Ajuste de Balance Inicial */}
                  <Line
                    type="monotone"
                    dataKey="balanceAjuste"
                    stroke="transparent"
                    isAnimationActive={false}
                    dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))" }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    name="Ajuste de Balance Inicial"
                    connectNulls={false}
                  >
                    <LabelList content={renderBalanceAdjustmentLabel} />
                  </Line>
                  {/* Balance Simulado (Ideal) */}
                  {isWarning && (
                    <Line
                      type="monotone"
                      dataKey="balanceSimulated"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      isAnimationActive={false}
                      dot={false}
                      strokeDasharray="4 4"
                      name="Proyección Ideal (Si se paga hoy)"
                      activeDot={{ r: 4, strokeWidth: 0, fill: "hsl(var(--muted-foreground))" }}
                      className="opacity-70"
                    />
                  )}
                </>
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card >
  );
};



