import React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/core/utils';

export type ChartSeriesToggleItem = {
  key: string;
  label: string;
  activeClassName: string;
  inactiveVariant?: 'ghost' | 'secondary';
};

type ChartSeriesTogglesProps = {
  items: ChartSeriesToggleItem[];
  value: Record<string, boolean>;
  onToggle: (key: string) => void;
  className?: string;
  buttonClassName?: string;
};

export function ChartSeriesToggles({
  items,
  value,
  onToggle,
  className,
  buttonClassName,
}: ChartSeriesTogglesProps) {
  return (
    <div className={cn('flex flex-wrap bg-muted/30 p-1 rounded-xl border border-border', className)}>
      {items.map((item) => {
        const isOn = !!value[item.key];
        return (
          <Button
            key={item.key}
            variant={isOn ? (item.inactiveVariant ?? 'secondary') : 'ghost'}
            size="sm"
            onClick={() => onToggle(item.key)}
            className={cn(
              'h-7 text-xs gap-1.5 transition-all hover:text-current px-3 justify-center whitespace-nowrap',
              isOn && item.activeClassName,
              buttonClassName
            )}
          >
            {isOn && <Check className="h-3 w-3" />} {item.label}
          </Button>
        );
      })}
    </div>
  );
}

