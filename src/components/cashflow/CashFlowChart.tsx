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
          <ResponsiveContainer width="80%" height={320}>
            <AreaChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="interest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-background p-3 rounded-xl shadow-lg border border-default min-w-[220px]">
                    <div className="font-semibold mb-1">{label}</div>
                    <div className="flex justify-between text-sm mb-1"><span>Salario</span><span>{formatCurrency(d?.ingresosSalario || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1 text-green-700"><span>Intereses Ahorro</span><span>{formatCurrency(d?.interesesAhorro || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1"><span>Gastos Futuros</span><span>{formatCurrency(d?.gastosFuturos || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1"><span>Cuotas Préstamos</span><span>{formatCurrency(d?.egresosPrestamos || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1"><span>Cuotas Tarjeta</span><span>{formatCurrency(d?.egresosTarjeta || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1"><span>Otros Egresos</span><span>{formatCurrency(d?.egresosReales || 0)}</span></div>
                    <div className="flex justify-between text-sm mb-1 font-semibold"><span>Balance Real</span><span>{d?.balanceReal !== null ? formatCurrency(d?.balanceReal) : '-'}</span></div>
                    <div className="flex justify-between text-sm mb-1 font-semibold"><span>Balance Proyectado</span><span>{formatCurrency(d?.balanceProyectado || 0)}</span></div>
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="ingresosSalario" stroke="hsl(var(--success))" fill="url(#income)" name="Salario" />
              <Area type="monotone" dataKey="interesesAhorro" stroke="hsl(var(--success))" fill="url(#interest)" name="Intereses Ahorro" />
              <Area type="monotone" dataKey="egresos" stroke="hsl(var(--destructive))" fill="url(#expense)" name="Egresos" />
              <Line type="monotone" dataKey="balanceReal" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} name="Balance Real" />
              <Line type="monotone" dataKey="balanceProyectado" stroke="hsl(var(--accent-primary))" strokeWidth={2} dot={false} strokeDasharray="6 3" name="Balance Proyectado" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
