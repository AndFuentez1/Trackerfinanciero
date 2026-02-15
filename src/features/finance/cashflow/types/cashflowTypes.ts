import type { MonthlySnapshot } from '@/features/finance/cashflow/utils/cashFlowCalculations';

export interface CashFlowChartPoint {
  name: string;
  nameMobile: string;
  ingresos: number;
  egresos: number;
  balanceReal: number | null;
  balanceProyectado: number | null;
  balanceSimulated: number | null;
  balanceAjuste?: number | null;
  balanceAjusteDelta?: number | null;
  isAfterPivot: boolean;
  isBeforePivot: boolean;
  isSamePivot: boolean;
  breakdown: MonthlySnapshot;
}
