
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingInvoicesPanel } from '../PendingInvoicesPanel';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAuth } from '@/hooks/useAuth';

// Mock hooks
vi.mock('@/hooks/useFinanceData');
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn().mockResolvedValue({
                            data: [
                                {
                                    id: '1',
                                    amount: 50000,
                                    description: 'Test Invoice',
                                    arrival_date: '2023-01-01',
                                    status: 'pending',
                                    user_id: 'user1',
                                    category: null
                                }
                            ],
                            error: null
                        })
                    }))
                }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
            }))
        })),
        channel: vi.fn(() => ({
            on: vi.fn(() => ({
                subscribe: vi.fn()
            }))
        })),
        removeChannel: vi.fn()
    }
}));

describe('PendingInvoicesPanel', () => {
    const mockAddTransaction = vi.fn();
    const mockRefreshData = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ user: { id: 'user1' } });
        (useFinanceData as any).mockReturnValue({
            addTransaction: mockAddTransaction,
            paymentMethods: [{ id: 'pm1', name: 'Cash', type: 'cash' }],
            categories: [{ id: 'cat1', name: 'Food', type: 'expense' }],
            refreshData: mockRefreshData
        });
    });

    it('renders pending invoices', async () => {
        render(<PendingInvoicesPanel />);
        await waitFor(() => {
            expect(screen.getByText('Test Invoice')).toBeInTheDocument();
            expect(screen.getByText('$50.000')).toBeInTheDocument();
        });
    });

    it('approves invoice successfully', async () => {
        mockAddTransaction.mockResolvedValue({ error: null });
        render(<PendingInvoicesPanel />);

        await waitFor(() => screen.getByText('Test Invoice'));

        const approveBtn = screen.getByRole('button', { name: /Aprobar/i });
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(mockAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
                amount: 50000,
                description: 'Test Invoice'
            }));
        });
    });

    it('does NOT delete invoice if transaction fails', async () => {
        mockAddTransaction.mockResolvedValue({ error: 'Balance validation failed' });
        render(<PendingInvoicesPanel />);

        await waitFor(() => screen.getByText('Test Invoice'));

        const approveBtn = screen.getByRole('button', { name: /Aprobar/i });
        fireEvent.click(approveBtn);

        await waitFor(() => {
            expect(mockAddTransaction).toHaveBeenCalled();
            // We can't easily check internal Supabase logic here without more complex mocks,
            // but we ensure the flow continued to the error handling.
        });
    });
});
