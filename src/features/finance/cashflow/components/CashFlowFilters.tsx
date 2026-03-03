import React from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/shared/ui/select';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';

interface CashFlowFiltersProps {
  year: number | 'all';
  month: number | 'all';
  onYearChange: (year: number | 'all') => void;
  onMonthChange: (month: number | 'all') => void;
  availableYears: number[];
  availableMonths: number[];
  loading?: boolean;
  useRealBalance: boolean;
  onRealBalanceChange: (value: boolean) => void;
}

export const CashFlowFilters: React.FC<CashFlowFiltersProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  availableYears,
  availableMonths,
  loading,
  useRealBalance,
  onRealBalanceChange,
}) => {
  return (
    <Card className="mb-4 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
        <Select value={year === 'all' ? 'all' : String(year)} onValueChange={v => onYearChange(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="min-w-[110px] h-9 rounded-full border border-default bg-background/50 text-xs">
            Año: {year === 'all' ? 'Todos' : year}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {availableYears.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month === 'all' ? 'all' : String(month)} onValueChange={v => onMonthChange(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="min-w-[110px] h-9 rounded-full border border-default bg-background/50 text-xs">
            Mes: {month === 'all' ? 'Todos' : month}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {availableMonths.map(m => (
              <SelectItem key={m} value={String(m)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end">
        <div className="flex items-center gap-2">
          <Label htmlFor="real-balance-filter" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Saldos reales
          </Label>
          <Switch
            id="real-balance-filter"
            checked={useRealBalance}
            onCheckedChange={onRealBalanceChange}
            className="data-[state=checked]:bg-primary scale-75"
          />
        </div>
        <Button variant="outline" size="sm" className="rounded-full border border-default h-9 px-6 bg-background/50 text-xs font-semibold">
          Filtrar
        </Button>
      </div>
    </Card>
  );
};

