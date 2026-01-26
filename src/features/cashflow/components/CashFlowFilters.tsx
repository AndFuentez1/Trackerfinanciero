import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';

interface CashFlowFiltersProps {
  year: number | 'all';
  month: number | 'all';
  onYearChange: (year: number | 'all') => void;
  onMonthChange: (month: number | 'all') => void;
  availableYears: number[];
  availableMonths: number[];
  loading?: boolean;
}

export const CashFlowFilters: React.FC<CashFlowFiltersProps> = ({
  year,
  month,
  onYearChange,
  onMonthChange,
  availableYears,
  availableMonths,
  loading,
}) => {
  return (
    <Card className="mb-4 p-4 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex gap-4 items-center">
        <Select value={year === 'all' ? 'all' : String(year)} onValueChange={v => onYearChange(v === 'all' ? 'all' : Number(v))}>
          <SelectTrigger className="min-w-[120px] rounded-full border border-default">
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
          <SelectTrigger className="min-w-[120px] rounded-full border border-default">
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
      <Button variant="outline" className="rounded-full border border-default">Filtrar</Button>
    </Card>
  );
};
