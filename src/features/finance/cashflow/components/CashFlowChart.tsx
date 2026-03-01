import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { Check, BarChart3 } from 'lucide-react';
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
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 items-center justify-center p-1">
              <BarChart3 className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-base sm:text-lg font-bold text-muted-foreground tracking-tight leading-none">
                Proyección de Flujo
              </p>
              <p className="text-sm text-muted-foreground mt-1 leading-tight">Estimación futura basada en presupuestos y obligaciones</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
            <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="balanceRealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="balanceProyectadoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="balanceWarningGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              {/* Líneas horizontales: extremadamente sutiles (estilo Sure) */}
              {yTicks.map(tick => (
                <ReferenceLine key={tick} y={tick} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.1} strokeWidth={1} />
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
                width={85}
                ticks={yTicks}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                content={<FinanceChartTooltip />}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} strokeDasharray="3 3" />

              {/* Bars & Lines controlled by Toggles */}

              {/* Fixed barSize + fillOpacity so bars keep position and width always */}
              <Bar
                dataKey="ingresos"
                name="Ingresos Totales"
                fill="hsl(var(--success))"
                radius={[4, 4, 0, 0]}
                barSize={14}
                fillOpacity={showIncome ? 0.7 : 0}
                isAnimationActive={false}
                legendType={showIncome ? 'circle' : 'none'}
              />

              <Bar
                dataKey="negativeEgresos"
                name="Egresos Totales"
                fill="hsl(var(--destructive))"
                radius={[0, 0, 4, 4]}
                barSize={14}
                fillOpacity={showExpense ? 0.7 : 0}
                isAnimationActive={false}
                legendType={showExpense ? 'circle' : 'none'}
              />

              {showBalance && (
                <>
                  {/* Balance Real (Histórico Descriptivo) */}
                  <Area
                    type="monotone"
                    dataKey="balanceReal"
                    stroke="hsl(var(--muted-foreground))"
                    fill="url(#balanceRealGradient)"
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                    dot={(props: { cx: number; cy: number; payload: CashFlowChartPoint }) => {
                      const { cx, cy, payload } = props;
                      if (payload.balanceReal == null) return <g key={`dot-br-${payload.name}`} />;
                      return (
                        <circle
                          key={`dot-br-${payload.name}`}
                          cx={cx} cy={cy} r={4}
                          fill="hsl(var(--background))"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))", fill: "hsl(var(--muted-foreground))" }}
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
                  <Area
                    type="monotone"
                    dataKey="balanceProyectado"
                    stroke={isWarning ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                    fill={isWarning ? "url(#balanceWarningGradient)" : "url(#balanceProyectadoGradient)"}
                    strokeWidth={2}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                    dot={(props: { cx: number; cy: number; payload: CashFlowChartPoint }) => {
                      const { cx, cy, payload } = props;
                      if (payload.balanceProyectado == null) return <g key={`dot-bp-${payload.name}`} />;
                      const color = isWarning ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
                      return (
                        <circle
                          key={`dot-bp-${payload.name}`}
                          cx={cx} cy={cy} r={4}
                          fill="hsl(var(--background))"
                          stroke={color}
                          strokeWidth={2}
                        />
                      );
                    }}
                    strokeDasharray="5 5"
                    name={isWarning ? "Proyección (Con Pendientes)" : "Proyección"}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))", fill: isWarning ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}
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



