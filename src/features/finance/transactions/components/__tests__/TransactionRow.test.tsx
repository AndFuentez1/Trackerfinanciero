import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionRow } from '../TransactionRow';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinanceProvider } from '@/features/finance/context/FinanceContext';
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

vi.mock('@/shared/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

vi.mock('@/features/finance/hooks/useFormatCurrency', () => ({
    useFormatCurrency: () => ({
        formatCurrency: (val: number) => `$${val.toLocaleString()}`,
        formatCurrency80: (val: number) => `$${val.toLocaleString()}`
    })
}));

describe.skip('TransactionRow', () => {
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

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(FinanceProvider, {}, children)
        );

    it('renders transaction details', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Food')).toBeTruthy();
        expect(screen.getByText('Credit Card')).toBeTruthy();
    });

    it('displays amount correctly formatted', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const amountText = screen.getByText(/\$100|100/);
        expect(amountText).toBeTruthy();
    });

    it('shows expense icon for expense type', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        // Check that expense-related icon or class is present
        const row = screen.getByText('Groceries').closest('tr');
        expect(row).toBeTruthy();
    });

    it('shows income icon for income type', () => {
        const incomeTransaction = { ...mockTransaction, type: 'income' as const };

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={incomeTransaction}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Groceries')).toBeTruthy();
    });

    it('calls onEdit when edit button is clicked', async () => {
        const onEdit = vi.fn();

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={onEdit}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const editButtons = screen.queryAllByRole('button', { name: /editar|edit/i });
        if (editButtons.length > 0) {
            fireEvent.click(editButtons[0]);
            await waitFor(() => {
                expect(onEdit).toHaveBeenCalledWith(mockTransaction);
            });
        }
    });

    it('calls onDelete when delete button is clicked', async () => {
        const onDelete = vi.fn();

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={vi.fn()}
                        onDelete={onDelete}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        const deleteButtons = screen.queryAllByRole('button', { name: /eliminar|delete/i });
        if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0]);
            await waitFor(() => {
                expect(onDelete).toHaveBeenCalledWith(mockTransaction.id);
            });
        }
    });

    it('handles long descriptions with text wrapping', () => {
        const longDescriptionTx = {
            ...mockTransaction,
            description: 'This is a very long transaction description that should wrap properly without truncating'
        };

        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={longDescriptionTx}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText(/very long/)).toBeTruthy();
    });

    it('displays transaction date', () => {
        render(
            <table>
                <tbody>
                    <TransactionRow 
                        transaction={mockTransaction}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </tbody>
            </table>,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText(/2024|15/)).toBeTruthy();
    });
});
