import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SavingsPage from '@/features/finance/savings/pages/Savings';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useSavingsData } from '@/features/finance/hooks/useSavingsData';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/features/auth/hooks/useAuth');
vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/finance/hooks/useSavingsData');

// Mock child components
vi.mock('@/features/finance/savings/components/SavingsPerformance', () => ({
    SavingsPerformance: ({ accounts }: any) => (
        <div data-testid="savings-performance">
            {accounts.map((a: any) => (
                <div key={a.id} data-testid={`account-${a.id}`}>{a.name}</div>
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
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
        (useFinanceData as any).mockReturnValue({
            loading: false,
            paymentMethods: [{ id: 'pm1', name: 'Cuenta Bank', balance: 1000 }],
            updatePaymentMethod: vi.fn(),
            addTransfer: vi.fn()
        });
        (useSavingsData as any).mockReturnValue({
            savingsAccounts: [
                { id: 'sa1', name: 'Ahorro Viaje', current_balance: 500 }
            ],
            savingsTransactions: [],
            loading: false,
            error: null,
            addSavingsAccount: vi.fn(),
            deleteSavingsAccount: vi.fn(),
            addSavingsTransaction: vi.fn(),
            refetch: vi.fn(),
            totalSavingsBalance: 500,
            accountPerformance: {}
        });
    });

    it('renders savings performance component', () => {
        render(<SavingsPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Ahorros')).toBeInTheDocument();
        expect(screen.getByTestId('savings-performance')).toBeInTheDocument();
        expect(screen.getByTestId('account-sa1')).toHaveTextContent('Ahorro Viaje');
    });

    it('displays error state', () => {
        (useSavingsData as any).mockReturnValue({
            savingsAccounts: [],
            loading: false,
            error: 'Error loading savings'
        });

        render(<SavingsPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Error loading savings')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
});
