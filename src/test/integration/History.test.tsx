import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoryPage from '@/features/finance/transactions/pages/History';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { MemoryRouter } from 'react-router-dom';

const { HistoryTabMock } = vi.hoisted(() => {
    return { HistoryTabMock: vi.fn((props: any) => <div data-testid="history-tab">Tabla Historial</div>) };
});

// Mocks
vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: vi.fn()
}));
vi.mock('@/features/finance/hooks/useUserConfig', () => ({
    useUserConfig: vi.fn(() => ({
        config: { hide_incomplete_alert: false, keep_session_alive: true },
        updateConfig: vi.fn(),
        loaded: true
    }))
}));
vi.mock('@/features/finance/hooks/useFinanceData', () => ({
    useFinanceData: vi.fn(() => ({
        loading: false,
        paymentMethods: [],
        categories: [],
        transactions: [],
        allTransactions: [],
        refresh: vi.fn(),
        summary: { totalBalance: 1000, monthlyIncome: 500, monthlyExpense: 300 }
    }))
}));

// Mock child components
vi.mock('@/features/finance/transactions/components/history/HistoryTab', () => ({
    default: HistoryTabMock
}));

describe('HistoryPage', () => {
    const mockUser = { id: 'u1' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, loading: false } as any);
        vi.mocked(useFinanceData).mockReturnValue({
            transactions: [],
            allTransactions: [],
            categories: [],
            paymentMethods: [],
            loading: false,
            refresh: vi.fn(),
            summary: { totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0 }
        } as any);
    });

    it('renders history tab correctly', () => {
        render(<HistoryPage />, { wrapper: MemoryRouter });
        expect(screen.getByTestId('history-tab')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        vi.mocked(useFinanceData).mockReturnValue({
            loading: true,
            transactions: [],
            allTransactions: [],
            categories: [],
            paymentMethods: [],
            refresh: vi.fn(),
            summary: { totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0 }
        } as any);

        render(<HistoryPage />, { wrapper: MemoryRouter });
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('filters transactions by type', async () => {
        render(<HistoryPage />, { wrapper: MemoryRouter });

        const filterButton = screen.getByText('Todos');
        fireEvent.click(filterButton);

        const incomeOption = screen.getByText('Ingresos');
        fireEvent.click(incomeOption);

        await waitFor(() => {
            expect(HistoryTabMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    typeFilter: 'income'
                }),
                expect.anything()
            );
        });
    });

    it('filters transactions by category', async () => {
        vi.mocked(useFinanceData).mockReturnValue({
            loading: false,
            categories: [{ id: 'c1', name: 'Comida', type: 'expense' }],
            transactions: [],
            allTransactions: [],
            paymentMethods: [],
            refresh: vi.fn(),
            summary: { totalBalance: 0, monthlyIncome: 0, monthlyExpense: 0 }
        } as any);

        render(<HistoryPage />, { wrapper: MemoryRouter });

        const categorySelect = screen.getByText('Categoría');
        fireEvent.click(categorySelect);

        const comidaOption = screen.getByText('Comida');
        fireEvent.click(comidaOption);

        await waitFor(() => {
            expect(HistoryTabMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    categoryFilter: 'c1'
                }),
                expect.anything()
            );
        });
    });
});
