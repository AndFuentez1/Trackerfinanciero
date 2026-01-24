import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';

interface CashFlowChartProps {
  data: any[];
  loading?: boolean;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, loading }) => {
  const { formatCurrency } = useFormatCurrency();
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div className="bg-background p-3 rounded-xl shadow-lg border border-default min-w-[180px]">
                    <div className="font-semibold mb-1">{label}</div>
                    {payload.map((entry, i) => (
                      <div key={i} className="flex justify-between text-sm mb-1" style={{ color: entry.color }}>
                        <span>{entry.name}</span>
                        <span>{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="income" stroke="hsl(var(--success))" fill="url(#income)" name="Ingresos" />
              <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#expense)" name="Gastos" />
              <Line type="monotone" dataKey="realBalance" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} name="Balance Real" />
              <Line type="monotone" dataKey="projectedBalance" stroke="hsl(var(--accent-primary))" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Balance Proyectado" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
