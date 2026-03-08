import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
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

  // Calculate dynamic domain from data
  const yDomain = React.useMemo(() => {
    if (!data || data.length === 0) { return [0, 1000000]; } // Fallback when no data

    const allValues: number[] = [];
    data.forEach(d => {
      if (d.ingresos != null) { allValues.push(d.ingresos); }
      if (d.egresos != null) { allValues.push(d.egresos); }
      if (d.balanceReal != null) { allValues.push(d.balanceReal); }
      if (d.balanceProyectado != null) { allValues.push(d.balanceProyectado); }
      if (d.balanceSimulated != null) { allValues.push(d.balanceSimulated); }
    });

    if (allValues.length === 0) { return [0, 1000000]; } // Fallback when no valid values

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Add 10% padding
    const padding = (max - min) * 0.1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [data]);

  // Filter States
  const [showIncome, setShowIncome] = useState(false); // Default off to be clean
  const [showExpense, setShowExpense] = useState(false);
  const [showBalance, setShowBalance] = useState(true); // Default on

  if (loading) {
    return (
      <Card className="mb-6 shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
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

  // Pre-process data to ensure continuity if needed, or rely on distinct keys
  // data comes with 'balanceReal' (only 1st point) and 'balanceProyectado' (all points)
  // We can render two lines.

  return (
    <Card className="mb-6 shadow-sm border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Proyección de Flujo</CardTitle>
            <CardDescription>Estimación futura basada en presupuestos y obligaciones</CardDescription>
          </div>

          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
            <Button
              variant={showIncome ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowIncome(!showIncome)}
              className={cn("h-7 text-xs gap-1.5 transition-all hover:text-current w-[90px] justify-center", showIncome && "bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/50 border border-emerald-200")}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-xs gap-1.5 transition-all hover:text-current w-[85px] justify-center", showExpense && "bg-rose-100/50 text-rose-700 hover:bg-rose-200/50 border border-rose-200")}
            >
              {showExpense && <Check className="h-3 w-3" />} Egresos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-xs gap-1.5 transition-all hover:text-current w-[85px] justify-center", showBalance && "bg-sky-100/70 text-sky-700 hover:bg-sky-200/50 border border-sky-200")}
            >
              {showBalance && <Check className="h-3 w-3" />} Balance
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="balanceHistoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="balanceProjectionGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
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
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.1)' }}
                content={<FinanceChartTooltip />}
              />

              {/* Bars & Lines controlled by Toggles */}

              {showIncome && (
                <Bar
                  dataKey="ingresos"
                  name="Ingresos Totales"
                  fill="hsl(var(--success))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fillOpacity={0.7}
                />
              )}

              {showExpense && (
                <Bar
                  dataKey="egresos"
                  name="Egresos Totales"
                  fill="hsl(var(--destructive))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  fillOpacity={0.7}
                />
              )}

              {showBalance && (
                <>
                  {/* Balance Real (Histórico Descriptivo) */}
                  <Line
                    type="monotone"
                    dataKey="balanceReal"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    connectNulls={true}
                    name="Balance Histórico"
                  />
                  {/* Balance Proyectado */}
                  <Line
                    type="monotone"
                    dataKey="balanceProyectado"
                    stroke={isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={2}
                    dot={{ r: 4, fill: isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))", strokeWidth: 1, stroke: "hsl(var(--background))" }}
                    strokeDasharray="5 5"
                    name={isWarning ? "Proyección (Con Pendientes)" : "Proyección"}
                    activeDot={{ r: 6, strokeWidth: 0, fill: isWarning ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}
                    className={isWarning ? "opacity-90" : "opacity-60"}
                  />
                  {/* Ajuste de Balance Inicial */}
                  <Line
                    type="monotone"
                    dataKey="balanceAjuste"
                    stroke="transparent"
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
                      dot={{ r: 4, fill: "hsl(var(--muted-foreground))", strokeWidth: 1, stroke: "hsl(var(--background))" }}
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



