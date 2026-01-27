import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { ArrowUpRight, ArrowDownRight, BadgeDollarSign, TrendingUp } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: number;
  loading?: boolean;
  colorVar?: string;
}

const iconMap = {
  "Ingresos Estimados": ArrowUpRight,
  "Gastos Futuros": ArrowDownRight,
  "Compromisos de Deuda": BadgeDollarSign,
  "Balance Proyectado": TrendingUp,
};

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, loading, colorVar }) => {
  const { formatCurrency } = useFormatCurrency();
  const Icon = iconMap[title] || ArrowUpRight;
  return (
    <div className="flex-1 min-w-[180px] p-0 bg-muted/40 rounded-xl relative px-5 py-4 flex flex-col gap-2">
      <span className="absolute top-3 right-3 text-muted-foreground/60"><Icon className="w-5 h-5" /></span>
      <span className="text-xs text-muted-foreground font-medium mb-1">{title}</span>
      {loading ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <span className="text-2xl font-bold text-foreground">{formatCurrency(value)}</span>
      )}
    </div>
  );
};

export const CashFlowSummaryCards: React.FC<{
  loading?: boolean;
  estimatedIncome: number;
  futureExpenses: number;
  debtCommitments: number;
  projectedBalance: number;
}> = ({ loading, estimatedIncome, futureExpenses, debtCommitments, projectedBalance }) => (
  <>
    <SummaryCard title="Ingresos Estimados" value={estimatedIncome} loading={loading} colorVar="--success" />
    <SummaryCard title="Gastos Futuros" value={futureExpenses} loading={loading} colorVar="--destructive" />
    <SummaryCard title="Compromisos de Deuda" value={debtCommitments} loading={loading} colorVar="--color-primary" />
    <SummaryCard title="Balance Proyectado" value={projectedBalance} loading={loading} colorVar="--color-primary" />
  </>
);
