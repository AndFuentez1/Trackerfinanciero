import React from 'react';
import { Skeleton } from '@/shared/ui/skeleton';
import { CurrencyDisplay } from '@/features/finance/components/CurrencyDisplay';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { Card } from '@/shared/ui/card';
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

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, loading }) => {
  const { currency } = useFinance();
  const Icon = iconMap[title] || ArrowUpRight;
  return (
    <Card className="flex-1 min-w-[180px] flex flex-col p-6 bg-gray-50/50 dark:bg-muted/20 border-border shadow-md relative">
      <span className="absolute top-3 right-3 text-muted-foreground/60"><Icon className="w-5 h-5" /></span>
      <span className="text-base text-muted-foreground font-medium mb-1">{title}</span>
      {loading ? (
        <Skeleton className="h-8 w-2/3" />
      ) : (
        <div className="flex items-baseline text-2xl font-bold text-foreground">
          <CurrencyDisplay
            amount={value}
            currencyCode={currency}
            className="text-2xl font-bold tracking-tight leading-none"
          />
        </div>
      )}
    </Card>
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
    <SummaryCard title="Compromisos de Deuda" value={debtCommitments} loading={loading} colorVar="--primary" />
    <SummaryCard title="Balance Proyectado" value={projectedBalance} loading={loading} colorVar="--primary" />
  </>
);


