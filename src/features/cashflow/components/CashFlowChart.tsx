import React, { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFinance } from '@/contexts/FinanceContext';
import { getCurrencySymbol } from '@/lib/utils';

interface CashFlowChartProps {
  data: any[];
  loading?: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, loading }) => {
  const { currency } = useFinance();
  const { formatCurrency } = useFormatCurrency();
  const symbol = getCurrencySymbol(currency || 'COP');

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
              className={cn("h-7 text-xs gap-1.5 transition-all", showIncome && "bg-[var(--income)]/15 text-[var(--income)] hover:bg-[var(--income)]/25 border border-[var(--income)]/20")}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn("h-7 text-xs gap-1.5 transition-all", showExpense && "bg-[var(--expense)]/15 text-[var(--expense)] hover:bg-[var(--expense)]/25 border border-[var(--expense)]/20")}
            >
              {showExpense && <Check className="h-3 w-3" />} Egresos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn("h-7 text-xs gap-1.5 transition-all", showBalance && "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20")}
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
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
                interval={0}
              />
              <YAxis
                tickFormatter={(val) => {
                  if (val === 0) return `${symbol}0`;
                  if (Math.abs(val) >= 1000000) {
                    const m = val / 1000000;
                    return `${symbol}${Number.isInteger(m) ? m : m.toFixed(1)}M`;
                  }
                  if (Math.abs(val) >= 1000) {
                    const k = val / 1000;
                    return `${symbol}${Number.isInteger(k) ? k : k.toFixed(0)}k`;
                  }
                  return `${symbol}${val}`;
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={60}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted)/0.1)', radius: 4 }}
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', boxShadow: 'var(--shadow-lg)' }}
                labelStyle={{ fontWeight: 600, color: 'hsl(var(--foreground))', marginBottom: '8px' }}
                formatter={(value: any, name: string) => [formatCurrency(Number(value)), name]}
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
                  {/* Balance Real (Point 0) */}
                  <Line
                    type="monotone"
                    dataKey="balanceReal"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--primary))", stroke: "#fff" }}
                    name="Balance Actual"
                    connectNulls
                  />
                  {/* Balance Proyectado */}
                  <Line
                    type="monotone"
                    dataKey="balanceProyectado"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 5"
                    name="Balance Proyectado"
                    activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                  />
                </>
              )}

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
