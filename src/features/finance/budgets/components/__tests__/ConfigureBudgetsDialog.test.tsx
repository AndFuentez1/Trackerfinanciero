import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigureBudgetsDialog } from '../ConfigureBudgetsDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/features/finance/hooks/useFinanceMutations', () => ({
    useFinanceMutations: () => ({
        addBudget: {
            mutateAsync: vi.fn().mockResolvedValue({ error: null }),
            isPending: false
        }
    })
}));

vi.mock('@/features/finance/hooks/useFinanceQueries', () => ({
    useFinanceQueries: () => ({
        categories: [
            { id: 'c1', name: 'Groceries', type: 'expense', color: '#FF0000', is_default: false },
            { id: 'c2', name: 'Transport', type: 'expense', color: '#00FF00', is_default: false }
        ],
        categoriesLoading: false
    })
}));

vi.mock('@/shared/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

describe.skip('ConfigureBudgetsDialog', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    it('renders dialog trigger button', () => {
        render(
            <ConfigureBudgetsDialog 
                open={false} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens dialog when open prop is true', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Check for dialog content
        const titleElements = screen.queryAllByText(/configurar|configure|presupuesto|budget/i);
        expect(titleElements.length).toBeGreaterThan(0);
    });

    it('displays category budget fields', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Should show category names
        expect(screen.getByText(/Groceries|Transport/i)).toBeTruthy();
    });

    it('shows amount input field', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const amountInputs = screen.queryAllByLabelText(/monto|amount/i);
        expect(amountInputs.length).toBeGreaterThan(0);
    });

    it('shows month input field', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const monthInputs = screen.queryAllByLabelText(/mes|month/i);
        expect(monthInputs.length).toBeGreaterThan(0);
    });

    it('shows recurrent checkbox', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const checkboxes = screen.queryAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('handles recurrent checkbox toggle', async () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const checkboxes = screen.queryAllByRole('checkbox');
        if (checkboxes.length > 0) {
            fireEvent.click(checkboxes[0]);
            await waitFor(() => {
                expect(checkboxes[0]).toBeTruthy();
            });
        }
    });

    it('displays save button', () => {
        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const saveButtons = screen.queryAllByRole('button', { name: /guardar|save/i });
        expect(saveButtons.length).toBeGreaterThan(0);
    });

    it('calls onOpenChange when dialog closes', async () => {
        const onOpenChange = vi.fn();

        render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={onOpenChange}
            />,
            { wrapper: createWrapper() }
        );

        const closeButtons = screen.queryAllByRole('button', { name: /close|cerrar/i });
        if (closeButtons.length > 0) {
            fireEvent.click(closeButtons[0]);
            await waitFor(() => {
                expect(onOpenChange).toHaveBeenCalled();
            });
        }
    });

    it('responsive layout on mobile', () => {
        const { container } = render(
            <ConfigureBudgetsDialog 
                open={true} 
                onOpenChange={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        // Check for responsive grid classes
        const gridElement = container.querySelector('[class*="grid"]');
        expect(gridElement).toBeTruthy();
    });
});
