import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinanceMutations } from '../useFinanceMutations';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
    }
}));

vi.mock('@/shared/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() })
}));

describe('useFinanceMutations', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const createWrapper = () => ({ children }: { children: React.ReactNode }) => (
        React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    it('addTransaction successfully creates transaction and updates balance', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { balance: 1000 }, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
        const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        const mockSelectTransaction = vi.fn().mockResolvedValue({ data: [{ id: 't1' }], error: null });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelectTransaction });

        vi.mocked(supabase.from).mockImplementation((table: string) => {
            return {
                insert: mockInsert,
                select: vi.fn(() => ({ eq: mockEq })),
                update: mockUpdate,
                eq: mockEq
            } as any;
        });

        // El Override ya no es necesario aquí


        const { result } = renderHook(() => useFinanceMutations('user1'), { wrapper: createWrapper() });

        const res = await result.current.addTransaction({
            amount: 500,
            type: 'expense',
            description: 'Test',
            category: 'Food',
            payment_method_id: 'pm1',
            date: '2024-01-01'
        });

        expect(res.error).toBeNull();
        expect(res.data?.id).toBe('t1');
        expect(mockInsert).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalled(); 
    });

    it('addPaymentMethod works correctly', async () => {
        const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'pm1', name: 'NewPM' }, error: null });
        const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
        const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

        vi.mocked(supabase.from).mockImplementation(() => {
            return {
                insert: mockInsert,
                select: mockSelect
            } as any;
        });

        // Ya no es necesario el Override

        const { result } = renderHook(() => useFinanceMutations('user1'), { wrapper: createWrapper() });

        const res = await result.current.addPaymentMethod({
            name: 'NewPM',
            type: 'cash',
            balance: 100,
            credit_limit: null,
            is_savings_account: false
        });

        expect(res.error).toBeNull();
        expect(res.data?.name).toBe('NewPM');
    });

    it('addTransfer creates two transactions and updates balances', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        const mockSingle = vi.fn().mockResolvedValue({ data: { balance: 1000 }, error: null });
        const mockEq = vi.fn().mockReturnValue({ single: mockSingle });

        vi.mocked(supabase.from).mockImplementation(() => {
            return {
                insert: mockInsert,
                update: mockUpdate,
                select: vi.fn().mockReturnValue({ eq: mockEq })
            } as any;
        });

        const { result } = renderHook(() => useFinanceMutations('user1'), { wrapper: createWrapper() });

        const res = await result.current.addTransfer({
            fromId: 'pm1',
            toId: 'pm2',
            amount: 500,
            date: '2024-01-01'
        });

        expect(res.error).toBeNull();
        expect(mockInsert).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledTimes(2); // updates both pm1 & pm2
    });

    it('deleteTransaction deletes transaction and reverts balance', async () => {
        const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
        const mockSingle = vi.fn((table?: string) => {
             // Dependeremos del closure anterior o devolveremos estático para PM
             return Promise.resolve({ data: { balance: 1000 }, error: null });
        });
        const mockSingleTxResponse = Promise.resolve({ data: { amount: 100, type: 'expense', payment_method_id: 'pm1' }, error: null });
        
        vi.mocked(supabase.from).mockImplementation((table: string) => {
            const isTx = table === 'transactions';
            const eqFn = vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue(isTx ? mockSingleTxResponse : mockSingle())
            });

            return {
                delete: mockDelete,
                update: mockUpdate,
                select: vi.fn().mockReturnValue({ eq: eqFn })
            } as any;
        });

        const { result } = renderHook(() => useFinanceMutations('user1'), { wrapper: createWrapper() });

        const res = await result.current.deleteTransaction('t1');

        expect(res.error).toBeNull();
        expect(mockDelete).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('deletePaymentMethod works', async () => {
        const mockDelete = vi.fn().mockReturnThis();
        vi.mocked(supabase.from).mockImplementation(() => {
            return {
                delete: mockDelete,
            } as any;
        });
        mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

        const { result } = renderHook(() => useFinanceMutations('user1'), { wrapper: createWrapper() });

        const res = await result.current.deletePaymentMethod('pm1');
        expect(res.error).toBeNull();
        expect(mockDelete).toHaveBeenCalled();
    });
});
