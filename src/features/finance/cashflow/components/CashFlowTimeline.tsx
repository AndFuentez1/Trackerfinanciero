import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';

interface TimelineEvent {
  id: string;
  name: string;
  date: string;
  amount: number;
  type: string;
}

interface CashFlowTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

export const CashFlowTimeline: React.FC<CashFlowTimelineProps> = ({ events, loading }) => {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-2">Próximos compromisos</h3>
        {loading ? (
          <Skeleton className="h-10 w-full mb-2" />
        ) : events.length === 0 ? (
          <div className="text-muted-foreground">No hay compromisos próximos.</div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map(ev => (
              <li key={ev.id} className="py-2 flex items-center justify-between">
                <span className="font-medium">{ev.name}</span>
                <span className="text-sm text-muted-foreground">{new Date(ev.date).toLocaleDateString('es-CO')}</span>
                <span className="font-semibold">{ev.amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

