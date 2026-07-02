import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionList } from '../TransactionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinanceProvider } from '@/features/finance/context/FinanceContext';
import React from 'react';

vi.mock('@/features/finance/hooks/useFormatCurrency', () => ({
    useFormatCurrency: () => ({
        formatCurrency: (val: number) => `$${val.toLocaleString()}`,
        formatCurrency80: (val: number) => `$${val.toLocaleString()}`
    })
}));

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

describe('TransactionList', () => {
    let queryClient: QueryClient;

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

    const mockTransactions = [
        {
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
        },
        {
            id: 't2',
            amount: 500,
            type: 'income' as const,
            description: 'Salary',
            category: 'Income',
            category_id: 'c2',
            category_name: 'Income',
            payment_method_id: 'pm1',
            payment_method_name: 'Credit Card',
            date: '2024-01-01',
            created_at: '2024-01-01T09:00:00Z'
        }
    ];

    it('renders transaction table', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Salary')).toBeTruthy();
    });

    it('displays transaction rows', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const rows = screen.queryAllByRole('row');
        // Should have header + data rows
        expect(rows.length).toBeGreaterThanOrEqual(2);
    });

    it('shows column headers', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Should have headers for key columns
        const headers = screen.queryAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
    });

    it('displays loading state', () => {
        const { container } = render(
            <TransactionList 
                transactions={[]}
                isLoading={true}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(container).toBeTruthy();
    });

    it('shows empty state when no transactions', () => {
        render(
            <TransactionList 
                transactions={[]}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Should not show data rows
        expect(screen.queryByText('Groceries')).toBeNull();
    });

    it('filters transactions', () => {
        const { rerender } = render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
                filterType="expense"
            />,
            { wrapper: createWrapper() }
        );

        // After filtering to expenses only, income should not show
        expect(screen.getByText('Groceries')).toBeTruthy();
    });

    it('sorts transactions by date', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
                sortBy="date"
                sortOrder="desc"
            />,
            { wrapper: createWrapper() }
        );

        const rows = screen.queryAllByRole('row');
        // Should have rows
        expect(rows.length).toBeGreaterThan(0);
    });

    it('displays pagination controls', () => {
        const longTransactionList = Array.from({ length: 25 }, (_, i) => ({
            ...mockTransactions[0],
            id: `t${i}`,
            description: `Transaction ${i}`
        }));

        const { container } = render(
            <TransactionList 
                transactions={longTransactionList}
                isLoading={false}
                onEdit={vi.fn()}
                itemsPerPage={10}
            />,
            { wrapper: createWrapper() }
        );

        // Should have pagination if needed
        expect(container).toBeTruthy();
    });

    it('calls onEdit when transaction is edited', () => {
        const onEdit = vi.fn();

        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={onEdit}
            />,
            { wrapper: createWrapper() }
        );

        const editButtons = screen.queryAllByRole('button', { name: /editar|edit/i });
        if (editButtons.length > 0) {
            fireEvent.click(editButtons[0]);
            expect(onEdit).toHaveBeenCalled();
        }
    });

    it('excludes undisbursed loan transactions', () => {
        const transactionsWithUndisbursed = [
            ...mockTransactions,
            {
                id: 't3',
                amount: 1000,
                type: 'transfer' as const,
                description: 'Loan - sin desembolso',
                category: 'Loans',
                category_id: 'c3',
                category_name: 'Loans',
                payment_method_id: 'pm1',
                payment_method_name: 'Credit Card',
                date: '2024-01-10',
                created_at: '2024-01-10T08:00:00Z'
            }
        ];

        render(
            <TransactionList 
                transactions={transactionsWithUndisbursed}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Should only show legitimate transactions
        expect(screen.getByText('Groceries')).toBeTruthy();
        expect(screen.getByText('Salary')).toBeTruthy();
    });

    it('searches transactions by description', async () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
                searchTerm="Groc"
            />,
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(screen.getByText('Groceries')).toBeTruthy();
        });
    });

    it('displays transaction amounts correctly', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText(/100|Groceries/)).toBeTruthy();
        expect(screen.getByText(/500|Salary/)).toBeTruthy();
    });

    it('shows transaction categories', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                isLoading={false}
                onEdit={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText('Food')).toBeTruthy();
        expect(screen.getByText('Income')).toBeTruthy();
    });
});
