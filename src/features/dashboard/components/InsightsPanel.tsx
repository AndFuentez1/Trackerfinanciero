import type { Insight } from '@/features/finance/hooks/useFinanceData';
import { AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { cn } from '@/core/utils';

interface InsightsPanelProps {
  insights: Insight[];
}

const iconMap = {
  warning: AlertTriangle,
  tip: Lightbulb,
  success: CheckCircle2,
};

const styleMap = {
  warning: 'bg-warning/10 text-warning border-warning/20',
  tip: 'bg-savings/10 text-savings border-savings/20',
  success: 'bg-income/10 text-income border-income/20',
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="finance-card">
      <h3 className="text-xl font-bold mb-6">Recomendaciones</h3>
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = iconMap[insight.type];
          return (
            <div
              key={insight.id}
              className={cn(
                'p-5 rounded-lg border animate-fade-in',
                styleMap[insight.type]
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex gap-4">
                <Icon className="h-6 w-6 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-base">{insight.title}</h4>
                  <p className="text-sm mt-2 opacity-90">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

