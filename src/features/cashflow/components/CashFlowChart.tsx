import React, { useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFinance } from '@/contexts/FinanceContext';
import { getCurrencySymbol } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CashFlowChartProps {
  data: any[];
  loading?: boolean;
}

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "hsl(var(--success))",
  },
  egresos: {
    label: "Egresos",
    color: "hsl(var(--destructive))",
  },
  balanceReal: {
    label: "Balance Actual",
    color: "hsl(var(--primary))",
  },
  balanceProyectado: {
    label: "Balance Proyectado",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, loading }) => {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const filledData = Array.from({ length: 12 }, (_, idx) => {
    if (data[idx]) return data[idx];
    return { name: monthNames[idx], ingresos: 0, egresos: 0, balanceReal: null, balanceProyectado: null };
  });

  const { currency } = useFinance();
  const { formatCurrency } = useFormatCurrency();
  const symbol = getCurrencySymbol(currency || 'COP');

  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

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
    );
  }

  return (
    <Card className="mb-6 shadow-sm border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">Proyección de Flujo</CardTitle>
            <CardDescription>Estimación futura basada en presupuestos y obligaciones</CardDescription>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
            <Button
              variant={showIncome ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowIncome(!showIncome)}
              className={cn(
                "h-7 text-xs gap-1.5 transition-all",
                showIncome && "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
              )}
            >
              {showIncome && <Check className="h-3 w-3" />} Ingresos
            </Button>
            <Button
              variant={showExpense ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowExpense(!showExpense)}
              className={cn(
                "h-7 text-xs gap-1.5 transition-all",
                showExpense && "bg-rose-500 text-white hover:bg-rose-600 shadow-sm"
              )}
            >
              {showExpense && <Check className="h-3 w-3" />} Egresos
            </Button>
            <Button
              variant={showBalance ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowBalance(!showBalance)}
              className={cn(
                "h-7 text-xs gap-1.5 transition-all",
                showBalance && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              )}
            >
              {showBalance && <Check className="h-3 w-3" />} Balance
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <ChartContainer config={chartConfig} className="h-[420px] w-full">
          <ComposedChart
            accessibilityLayer
            data={filledData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value, idx) => monthNames[idx]}
            />
            <YAxis
              tickFormatter={(val) => {
                if (Math.abs(val) >= 1000000) return `${symbol}${(val / 1000000).toFixed(1)}M`;
                if (Math.abs(val) >= 1000) return `${symbol}${(val / 1000).toFixed(0)}k`;
                return `${symbol}${val}`;
              }}
              axisLine={false}
              tickLine={false}
              width={40} // Adjust width to prevent cutoff
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" formatter={(value, name) => [formatCurrency(Number(value)), name]} />}
            />

            <defs>
              <linearGradient id="fillIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ingresos)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-ingresos)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-egresos)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-egresos)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            {showIncome && (
              <Area
                dataKey="ingresos"
                type="natural"
                fill="url(#fillIngresos)"
                fillOpacity={0.4}
                stroke="var(--color-ingresos)"
                stackId="a"
              />
            )}

            {showExpense && (
              <Area
                dataKey="egresos"
                type="natural"
                fill="url(#fillEgresos)"
                fillOpacity={0.4}
                stroke="var(--color-egresos)"
                stackId="b"
              />
            )}

            {showBalance && (
              <>
                <Line
                  dataKey="balanceReal"
                  type="monotone"
                  stroke="var(--color-balanceReal)"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "var(--color-balanceReal)",
                    strokeWidth: 2,
                    stroke: "var(--background)"
                  }}
                  activeDot={{
                    r: 6,
                  }}
                  connectNulls
                />
                <Line
                  dataKey="balanceProyectado"
                  type="monotone"
                  stroke="var(--color-balanceProyectado)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{
                    r: 6,
                  }}
                />
              </>
            )}

            <ChartLegend content={<ChartLegendContent />} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
