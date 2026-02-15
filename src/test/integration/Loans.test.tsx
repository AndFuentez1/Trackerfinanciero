import { describe, it, expect, vi, beforeEach } from 'vitest';
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
vi.mock('@/features/finance/loans/hooks/useLoans');
vi.mock('@/features/finance/hooks/useFinanceData');
vi.mock('@/features/finance/hooks/useDecimalPlaces');
vi.mock('@/features/finance/hooks/useFormatCurrency');
vi.mock('@/features/finance/context/FinanceContext');

// Mock specific hooks return types
const mockCreateLoan = vi.fn();
const mockUpdateLoan = vi.fn();
const mockDeleteLoan = vi.fn();
const mockCreatePayment = vi.fn();
const mockRefetch = vi.fn();

describe('LoansPage', () => {
    const mockUser = { id: 'u1' };

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false });

        // Mock the complex useLoans hook return structure
        (useLoans as any).mockReturnValue({
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
                    created_at: '2024-01-01'
                }
            ],
            loading: false,
            error: null,
            refetch: mockRefetch
        });

        // Mock the separate hooks imported from same file
        // Note: In the file, they are imported as named exports. 
        // We need to mock the MODULE return for those named exports if they are hooks.
        // We can't easily mock named exports individually if we already mocked the whole module above.
        // We need to ensure the module mock includes them.
    });
});

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
        (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false });
        (useFinanceData as any).mockReturnValue({
            paymentMethods: [{ id: 'pm1', name: 'Banco', balance: 5000 }],
            updateTransaction: vi.fn(),
            transactions: [],
            allTransactions: [], // Add if needed
        });
        (useDecimalPlaces as any).mockReturnValue(2);
        (useFormatCurrency as any).mockReturnValue({
            formatCurrency: (val: number) => `$${val}`,
            formatCurrencySmall: (val: number) => `$${val}`,
            decimalPlaces: 2
        });
        (useFinance as any).mockReturnValue({
            currency: 'USD',
            decimalPlaces: 2
        });

        (useLoans as any).mockReturnValue({
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
            refetch: mockRefetch
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
            expect(screen.getByText('Agregar Nuevo Préstamo')).toBeInTheDocument();
        });
    });

    it('displays error state', () => {
        (useLoans as any).mockReturnValue({
            loans: [],
            loading: false,
            error: 'Error al cargar'
        });

        render(<LoansPage />, { wrapper: MemoryRouter });
        expect(screen.getByText('Error al cargar')).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });
});
