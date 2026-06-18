import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoansPage from '@/features/finance/loans/pages/Loans';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLoans } from '@/features/finance/loans/hooks/useLoans';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useDecimalPlaces } from '@/features/finance/hooks/useDecimalPlaces';
import { useFormatCurrency } from '@/features/finance/hooks/useFormatCurrency';
import { useFinance } from '@/features/finance/context/FinanceContext';
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
vi.mock('@/features/finance/loans/hooks/useLoans');
vi.mock('@/features/finance/hooks/useFinanceData', () => ({
    useFinanceData: vi.fn()
}));
vi.mock('@/features/finance/hooks/useDecimalPlaces');
vi.mock('@/features/finance/hooks/useFormatCurrency');
vi.mock('@/features/finance/context/FinanceContext');

// Mock specific hooks return types
const mockCreateLoan = vi.fn();
const mockUpdateLoan = vi.fn();
const mockDeleteLoan = vi.fn();
const mockCreatePayment = vi.fn();
const mockRefetch = vi.fn();



// Since we need to mock multiple exports from useLoans.ts:
vi.mock('@/features/finance/loans/hooks/useLoans', async (importOriginal) => {
    return {
        useLoans: vi.fn(),
        useCreateLoan: vi.fn(() => ({ createLoan: mockCreateLoan })),
        useUpdateLoan: vi.fn(() => ({ updateLoan: mockUpdateLoan, deleteLoan: mockDeleteLoan })),
        useCreateLoanPayment: vi.fn(() => ({ createPayment: mockCreatePayment })),
    };
});

describe('LoansPage Integration', () => {
    // Re-setup inside describe to use locally defined variables if needed, or global
    beforeEach(() => {
        (useAuth as Mock).mockReturnValue({ user: { id: 'u1' }, loading: false });
        (useFinanceData as Mock).mockReturnValue({
            paymentMethods: [{ id: 'pm1', name: 'Banco', balance: 5000 }],
            updateTransaction: vi.fn(),
            transactions: [],
            allTransactions: [], // Add if needed
            budgets: []
        });
        (useDecimalPlaces as Mock).mockReturnValue(2);
        (useFormatCurrency as Mock).mockReturnValue({
            formatCurrency: (val: number) => `$${val}`,
            formatCurrencySmall: (val: number) => `$${val}`,
            decimalPlaces: 2
        });
        (useFinance as Mock).mockReturnValue({
            currency: 'USD',
            decimalPlaces: 2
        });

        vi.mocked(useLoans).mockReturnValue({
            loans: [
                {
                    id: 'l1',
                    name: 'Préstamo Auto',
                    total_amount: 10000,
                    paid_amount: 2000,
                    interest_rate: 5,
                    type: 'borrowed',
                    is_disbursed: true,
                    payment_method_id: 'pm1',
                    due_date: '2024-12-31T00:00:00', // Future date
                }
            ],
            loading: false,
            error: null,
        });
    });

    it('renders loan list', () => {
        render(<LoansPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Préstamos y Deudas')).toBeInTheDocument();
        expect(screen.getByText('Préstamo Auto')).toBeInTheDocument();
        // Check progress 2000/10000 = 20%
        expect(screen.getByText('20.00%')).toBeInTheDocument();
        expect(screen.getByText('Deuda')).toBeInTheDocument();
    });

    it('opens create dialog', async () => {
        render(<LoansPage />, { wrapper: MemoryRouter });
        const createBtn = screen.getByTitle('Nuevo préstamo'); // aria-label or title
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(screen.getByText('Nuevo Préstamo')).toBeInTheDocument();
        });
    });

    it('displays error state', () => {
        (useLoans as Mock).mockReturnValue({
            loans: [],
            loading: false,
            error: 'Error al cargar'
        });
        (useFinanceData as Mock).mockReturnValue({
            paymentMethods: [],
            updateTransaction: vi.fn(),
            transactions: []
        });

        render(<LoansPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Error al cargar')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
});
