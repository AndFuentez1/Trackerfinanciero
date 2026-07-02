import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionRow } from '../TransactionRow';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/features/finance/hooks/useFinanceMutations', () => ({
    useFinanceMutations: () => ({
        updateTransaction: {
            mutateAsync: vi.fn().mockResolvedValue({ error: null }),
            isPending: false
        },
        deleteTransaction: {
            mutateAsync: vi.fn().mockResolvedValue({ error: null }),
            isPending: false
        }
    })
}));

vi.mock('@/features/finance/hooks/useFinanceData', () => ({
    useFinanceData: () => ({
        addCategory: vi.fn(),
        categories: []
    })
}));

vi.mock('@/features/finance/hooks/useDecimalPlaces', () => ({
    useDecimalPlaces: () => 2
}));

vi.mock('@/shared/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/features/finance/hooks/useFormatCurrency', () => ({
    useFormatCurrency: () => ({
        formatCurrency: (val: number) => `$${val.toLocaleString()}`,
        formatCurrency80: (val: number) => `$${val.toLocaleString()}`,
        formatCurrencySmall: (val: number) => `$${val.toLocaleString()}`
    })
}));

describe('TransactionRow', () => {
    let queryClient: QueryClient;
    const mockTransaction = {
        id: 't1',
        amount: 100,
        type: 'expense' as const,
        description: 'Groceries',
        category: 'Food',
        category_id: 'c1',
        category_name: 'Food',
        payment_method_id: 'pm1',
        payment_method_name: 'Credit Card',
        date: '2024-01-15',
        created_at: '2024-01-15T10:00:00Z'
    };

    const paymentMethods = [{ id: 'pm1', name: 'Credit Card', type: 'credit' as const }];
    const categories = [{ id: 'c1', name: 'Food', type: 'expense' as const, color: '#3b82f6' }];

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const defaultProps = {
        isEditing: false,
        draft: null,
        paymentMethods,
        categories,
        highlightOrphaned: false,
        currency: 'COP',
        onStartEdit: vi.fn(),
        onCancelEdit: vi.fn(),
        onSaveEdit: vi.fn(),
        onDelete: vi.fn(),
        onDraftChange: vi.fn(),
        onUpdate: vi.fn()
    };

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    it('renders transaction details', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        {...defaultProps}
                        transaction={mockTransaction}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Food')).toBeTruthy();
        expect(screen.getByText(/Credit Card/)).toBeTruthy();
    });

    it('displays amount correctly formatted', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        {...defaultProps}
                        transaction={mockTransaction}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const amountText = screen.getByText(/\$100|100/);
        expect(amountText).toBeTruthy();
    });

    it('calls onStartEdit when edit button is clicked', async () => {
        const onStartEdit = vi.fn();
        const props = { ...defaultProps, onStartEdit };

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        {...props}
                        transaction={mockTransaction}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const editButton = screen.getByRole('button', { name: /editar transacción/i });
        fireEvent.click(editButton);

        await waitFor(() => {
            expect(onStartEdit).toHaveBeenCalledWith(mockTransaction);
        });
    });

    it('calls onDelete when delete button is clicked', async () => {
        const onDelete = vi.fn();
        const props = { ...defaultProps, onDelete };

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        {...props}
                        transaction={mockTransaction}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const deleteButton = screen.getByRole('button', { name: /eliminar transacción/i });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(onDelete).toHaveBeenCalledWith(mockTransaction.id);
        });
    });

    it('displays transaction date', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        {...defaultProps}
                        transaction={mockTransaction}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('15/ene/24')).toBeTruthy();
    });
});
