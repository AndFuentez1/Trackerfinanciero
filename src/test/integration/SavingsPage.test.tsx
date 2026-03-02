import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SavingsPage from '@/features/finance/savings/pages/Savings';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/features/finance/hooks/useUserConfig', () => ({
    useUserConfig: vi.fn(() => ({
        config: { hide_incomplete_alert: false, keep_session_alive: true },
        updateConfig: vi.fn(),
        loaded: true
    }))
}));
vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/finance/hooks/useSavingsData');

// Mock child components
vi.mock('@/features/finance/savings/components/SavingsPerformance', () => ({
    SavingsPerformance: ({ accounts }: { accounts: Record<string, unknown>[] }) => (
        <div data-testid="savings-performance">
            {accounts.map((a: Record<string, unknown>) => (
                <div key={String(a.id)} data-testid={`account-${String(a.id)}`}>{String(a.name)}</div>
            ))}
        </div>
    )
}));
vi.mock('@/features/finance/payment-methods/components/EditPaymentMethodDialog', () => ({
    EditPaymentMethodDialog: () => <div data-testid="edit-dialog">Dialogo Editar</div>
}));

describe('SavingsPage', () => {
    const mockUser = { id: 'u1' };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ user: mockUser, loading: false } as unknown as ReturnType<typeof useAuth>);
        vi.mocked(useFinanceData).mockReturnValue({
            loading: false,
            paymentMethods: [{ id: 'pm1', name: 'Cuenta Bank', balance: 1000 }],
            updatePaymentMethod: vi.fn(),
            addTransfer: vi.fn()
        } as unknown as ReturnType<typeof useFinanceData>);
        vi.mocked(useSavingsData).mockReturnValue({
            savingsAccounts: [
                { id: 'sa1', name: 'Ahorro Viaje', balance: 500, interest_rate: 0 }
            ],
            savingsTransactions: [],
            loading: false,
            error: null,
            addSavingsAccount: vi.fn(),
            deleteSavingsAccount: vi.fn(),
            addSavingsTransaction: vi.fn(),
            refetch: vi.fn(),
            totalSavingsBalance: 500,
            accountPerformance: []
        } as unknown as ReturnType<typeof useSavingsData>);
    });

    it('renders savings performance component', () => {
        render(<SavingsPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Ahorros')).toBeInTheDocument();
        expect(screen.getByTestId('savings-performance')).toBeInTheDocument();
        expect(screen.getByTestId('account-sa1')).toHaveTextContent('Ahorro Viaje');
    });

    it('displays error state', () => {
        vi.mocked(useSavingsData).mockReturnValue({
            savingsAccounts: [],
            loading: false,
            error: 'Error loading savings'
        } as unknown as ReturnType<typeof useSavingsData>);

        render(<SavingsPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Error loading savings')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
});
