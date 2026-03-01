import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinanceQueries } from '../useFinanceQueries';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

// Supabase mock
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
    }
}));

describe('useFinanceQueries', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false, // disable retries for faster tests
                },
            },
        });
        vi.clearAllMocks();
    });

    const createWrapper = () => {
        return ({ children }: { children: React.ReactNode }) => (
            React.createElement(QueryClientProvider, { client: queryClient }, children)
        );
    };

    it('returns empty data when userId is empty (queries disabled)', () => {
        const { result } = renderHook(() => useFinanceQueries(''), { wrapper: createWrapper() });
        
        expect(result.current.paymentMethods).toEqual([]);
        expect(result.current.categories).toEqual([]);
        expect(result.current.budgets).toEqual([]);
        expect(result.current.profile).toBeNull();
        expect(result.current.pendingInvoices).toEqual([]);
    });

    it('fetches and maps all data successfully when userId is provided', async () => {
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn((field, val) => {
                        if (table === 'profiles') {
                            return { single: vi.fn().mockResolvedValue({ data: { currency: 'COP', onboarding_decision: 'completed' }, error: null }) };
                        }
                        if (table === 'pending_invoices') {
                            return {
                                eq: vi.fn().mockReturnThis(),
                                or: vi.fn().mockResolvedValue({ data: [{ id: 'pi1', amount: 100 }], error: null })
                            };
                        }
                        if (table === 'payment_methods') return Promise.resolve({ data: [{ id: 'pm1', name: 'Cash', type: 'cash', balance: 100 }], error: null });
                        if (table === 'categories') return Promise.resolve({ data: [{ id: 'c1', name: 'Food', type: 'expense', color: '#000' }], error: null });
                        if (table === 'budgets') return Promise.resolve({ data: [{ id: 'b1', category: 'Food', amount: 500, month: '2024-01' }], error: null });
                        return Promise.resolve({ data: [], error: null });
                    })
                }))
            } as any;
        });

        const { result } = renderHook(() => useFinanceQueries('user1'), { wrapper: createWrapper() });

        await waitFor(() => {
             expect(result.current.queriesLoading).toBe(false);
        }, { timeout: 2000 });

        expect(result.current.paymentMethods).toHaveLength(1);
        expect(result.current.paymentMethods[0].name).toBe('Cash');
        expect(result.current.paymentMethods[0].balance).toBe(100);
        
        expect(result.current.categories).toHaveLength(1);
        expect(result.current.categories[0].name).toBe('Food');

        expect(result.current.budgets).toHaveLength(1);
        expect(result.current.budgets[0].amount).toBe(500);

        expect(result.current.profile?.currency).toBe('COP');
        
        expect(result.current.pendingInvoices).toHaveLength(1);
    });

    it('handles query errors gracefully', async () => {
        // We simulate that the first query fail, react-query retries is false, so it will stop loading and throw the error to the query state
        vi.mocked(supabase.from).mockImplementation(() => {
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => Promise.resolve({ data: null, error: new Error('Network error') }))
                }))
            } as any;
        });

        const { result } = renderHook(() => useFinanceQueries('user2'), { wrapper: createWrapper() });
        
        await waitFor(() => {
            expect(result.current.queriesLoading).toBe(false);
        });

        // The default values should be returned instead of crashing the hook directly (until it's consumed by a boundary if suspense is true, but it's false here)
        expect(result.current.paymentMethods).toEqual([]);
    });
});
