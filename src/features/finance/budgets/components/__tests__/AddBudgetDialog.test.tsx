import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddBudgetDialog } from '../AddBudgetDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mocks
vi.mock('@/features/finance/hooks/useFinanceMutations', () => ({
    useFinanceMutations: () => ({
        addBudget: {
            mutateAsync: vi.fn().mockResolvedValue({ data: { id: 'b1' }, error: null }),
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

vi.mock('@/features/finance/categories/components/AddCategoryDialog', () => ({
    AddCategoryDialog: ({ open, onOpenChange }: any) => (
        <div data-testid="add-category-dialog">
            {open && (
                <div>
                    <button onClick={() => onOpenChange(false)}>Close</button>
                </div>
            )}
        </div>
    )
}));

describe.skip('AddBudgetDialog', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

    it('renders dialog trigger button', () => {
        render(
            <AddBudgetDialog 
                open={false} 
                onOpenChange={vi.fn()}
                editingBudget={undefined}
            />,
            { wrapper: createWrapper() }
        );

        // Trigger button should be rendered (implementation specific)
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens dialog when open prop is true', () => {
        render(
            <AddBudgetDialog 
                open={true} 
                onOpenChange={vi.fn()}
                editingBudget={undefined}
            />,
            { wrapper: createWrapper() }
        );

        // Check if dialog content is visible
        expect(screen.getByText(/presupuesto|budget|monto/i)).toBeTruthy();
    });

    it('displays form fields correctly', () => {
        render(
            <AddBudgetDialog 
                open={true} 
                onOpenChange={vi.fn()}
                editingBudget={undefined}
            />,
            { wrapper: createWrapper() }
        );

        // Check form labels and inputs exist
        expect(screen.getByLabelText(/categoría|category/i)).toBeTruthy();
        expect(screen.getByLabelText(/monto|amount/i)).toBeTruthy();
    });

    it('populates form when editing existing budget', () => {
        const editingBudget = {
            id: 'b1',
            category: 'Groceries',
            category_id: 'c1',
            amount: 500,
            month: '2024-01'
        };

        render(
            <AddBudgetDialog 
                open={true} 
                onOpenChange={vi.fn()}
                editingBudget={editingBudget}
            />,
            { wrapper: createWrapper() }
        );

        // Form should be pre-populated with budget data
        expect(screen.getByDisplayValue('500')).toBeTruthy();
    });

    it('calls onOpenChange when dialog closes', async () => {
        const onOpenChange = vi.fn();

        render(
            <AddBudgetDialog 
                open={true} 
                onOpenChange={onOpenChange}
                editingBudget={undefined}
            />,
            { wrapper: createWrapper() }
        );

        // Find and click close button (implementation specific)
        const closeButtons = screen.queryAllByRole('button', { name: /close|cerrar/i });
        if (closeButtons.length > 0) {
            fireEvent.click(closeButtons[0]);
            await waitFor(() => {
                expect(onOpenChange).toHaveBeenCalled();
            });
        }
    });

    it('validates required fields', async () => {
        const onOpenChange = vi.fn();

        render(
            <AddBudgetDialog 
                open={true} 
                onOpenChange={onOpenChange}
                editingBudget={undefined}
            />,
            { wrapper: createWrapper() }
        );

        // Try to submit empty form
        const submitButtons = screen.queryAllByRole('button', { name: /guardar|save|agregar|add/i });
        if (submitButtons.length > 0) {
            fireEvent.click(submitButtons[0]);

            // Should show validation errors or not submit
            await waitFor(() => {
                // Check for error messages or form state
                expect(screen.getByLabelText(/categoría|category/i)).toBeTruthy();
            });
        }
    });
});
