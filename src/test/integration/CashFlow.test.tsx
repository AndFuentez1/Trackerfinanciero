import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CashFlowPage from '@/features/finance/cashflow/pages/CashFlow';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCashFlow } from '@/features/finance/cashflow/hooks/useCashFlow';
import { useUserConfigStatus } from '@/features/settings/components/hooks/useUserConfigStatus';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useLoans } from '@/features/finance/loans/hooks/useLoans';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/features/finance/cashflow/hooks/useCashFlow');
vi.mock('@/features/settings/components/hooks/useUserConfigStatus');
vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/finance/loans/hooks/useLoans');
vi.mock('@/features/finance/hooks/useSavingsData');
vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        setQueryData: vi.fn()
    })
}));
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            update: vi.fn(() => ({
                eq: vi.fn()
            }))
        }))
    }
}));

vi.mock('@/features/finance/cashflow/components/CashFlowFilters', () => ({
    CashFlowFilters: () => <div data-testid="cashflow-filters">Filtros</div>
}));
vi.mock('@/features/finance/cashflow/components/CashFlowSummaryCards', () => ({
    CashFlowSummaryCards: () => <div data-testid="cashflow-summary">Resumen</div>
}));
vi.mock('@/features/finance/cashflow/components/CashFlowChart', () => ({
    CashFlowChart: () => <div data-testid="cashflow-chart">Chart</div>
}));
vi.mock('@/features/finance/cashflow/components/CashFlowTimeline', () => ({
    CashFlowTimeline: () => <div data-testid="cashflow-timeline">Timeline</div>
}));

describe('CashFlowPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1' }, loading: false } as ReturnType<typeof useAuth>);
        vi.mocked(useUserConfigStatus).mockReturnValue({
            data: { cashflowUseRealBalance: false }
        } as ReturnType<typeof useUserConfigStatus>);
        vi.mocked(useFinanceData).mockReturnValue({
            bootLoading: false
        } as unknown as ReturnType<typeof useFinanceData>);
        vi.mocked(useLoans).mockReturnValue({
            bootLoading: false
        } as unknown as ReturnType<typeof useLoans>);
        vi.mocked(useSavingsData).mockReturnValue({
            bootLoading: false
        } as unknown as ReturnType<typeof useSavingsData>);
        vi.mocked(useCashFlow).mockReturnValue({
            cashFlowSeries: [{ balanceProyectado: 100 }],
            proyeccion_ingresos: 1000,
            compromisos_deuda: 200,
            monthlyBreakdown: [
                {
                    mes: 'Ene 2026',
                    ingresosTotales: 1000,
                    egresosTotales: 500,
                    balanceNetoMes: 500,
                    balanceAcumulado: 500
                }
            ],
            isProjectionWarning: false,
            balance_actual: 500
        } as ReturnType<typeof useCashFlow>);
    });

    it('renders cashflow page with core sections', () => {
        render(<CashFlowPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Flujo de Caja')).toBeInTheDocument();
        expect(screen.getByTestId('cashflow-filters')).toBeInTheDocument();
        expect(screen.getByTestId('cashflow-summary')).toBeInTheDocument();
        expect(screen.getByTestId('cashflow-chart')).toBeInTheDocument();
    });
});
