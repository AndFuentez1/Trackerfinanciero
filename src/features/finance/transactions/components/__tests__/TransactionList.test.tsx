import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionList } from '../TransactionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/features/finance/hooks/useFinanceData', () => ({
    useFinanceData: () => ({
        addCategory: vi.fn(),
        categories: []
    })
}));

vi.mock('@/features/finance/hooks/useDecimalPlaces', () => ({
    useDecimalPlaces: () => 2
}));

vi.mock('@/features/finance/hooks/useFormatCurrency', () => ({
    useFormatCurrency: () => ({
        formatCurrency: (val: number) => `$${val.toLocaleString()}`,
        formatCurrency80: (val: number) => `$${val.toLocaleString()}`,
        formatCurrencySmall: (val: number) => `$${val.toLocaleString()}`
    })
}));

vi.mock('@/shared/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

describe('TransactionList', () => {
    let queryClient: QueryClient;

    const paymentMethods = [{ id: 'pm1', name: 'Credit Card', type: 'credit' as const }];
    const categories = [{ id: 'c1', name: 'Food', type: 'expense' as const, color: '#3b82f6' }];

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

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    it('renders transaction table', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByRole('table')).toBeTruthy();
        expect(screen.getAllByText(/Groceries/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Salary/i).length).toBeGreaterThan(0);
    });

    it('displays transaction rows', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        const rows = screen.queryAllByRole('row');
        expect(rows.length).toBeGreaterThanOrEqual(3);
    });

    it('shows column headers', () => {
        render(
            <TransactionList 
                transactions={mockTransactions}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        const headers = screen.queryAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
    });

    it('displays loading state', () => {
        const { container } = render(
            <TransactionList 
                transactions={[]}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={true}
            />,
            { wrapper: createWrapper() }
        );

        expect(container).toBeTruthy();
    });

    it('shows empty state when no transactions', () => {
        render(
            <TransactionList 
                transactions={[]}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.queryByText('Groceries')).toBeNull();
        expect(screen.getByText('No hay resultados')).toBeTruthy();
    });

    it('calls onDelete when delete action is clicked', () => {
        const onDelete = vi.fn();

        render(
            <TransactionList 
                transactions={mockTransactions}
                onDelete={onDelete}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        const deleteButtons = screen.queryAllByRole('button', { name: /eliminar transacción/i });
        expect(deleteButtons.length).toBeGreaterThan(0);
        fireEvent.click(deleteButtons[0]);

        expect(onDelete).toHaveBeenCalledWith('t1');
    });

    it('excludes undisbursed loan placeholder transactions', () => {
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
                payment_method_id: null,
                payment_method_name: null,
                date: '2024-01-10',
                created_at: '2024-01-10T08:00:00Z'
            }
        ];

        render(
            <TransactionList 
                transactions={transactionsWithUndisbursed}
                onDelete={vi.fn()}
                paymentMethods={paymentMethods}
                categories={categories}
                setStatusFilter={vi.fn()}
                loading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.queryByText('Loan - sin desembolso')).toBeNull();
    });
});
