import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
    adjustBalances,
    balanceDeltaFor,
    invertBalanceChanges,
    mergeBalanceChanges,
    withBalanceChanges,
} from './balanceUtils';

vi.mock('@/integrations/supabase/client', () => ({
    supabase: { rpc: vi.fn() },
}));

const rpc = vi.mocked(supabase.rpc);

describe('balanceDeltaFor', () => {
    it('suma ingresos y transferencias recibidas', () => {
        expect(balanceDeltaFor('income', 100)).toBe(100);
        expect(balanceDeltaFor('transfer_in', '50')).toBe(50);
    });

    it('resta gastos y transferencias enviadas aunque vengan con signo negativo', () => {
        expect(balanceDeltaFor('expense', 100)).toBe(-100);
        expect(balanceDeltaFor('transfer_out', -80)).toBe(-80);
        expect(balanceDeltaFor('savings', 20)).toBe(-20);
    });

    it('trata montos vacíos como 0', () => {
        expect(balanceDeltaFor('expense', null)).toBe(-0);
        expect(balanceDeltaFor(undefined, 'abc')).toBe(-0);
    });
});

describe('mergeBalanceChanges', () => {
    it('agrupa por cuenta y descarta los que se anulan', () => {
        expect(mergeBalanceChanges([
            { id: 'a', delta: 100 },
            { id: 'b', delta: -30 },
            { id: 'a', delta: -100 },
            { id: 'b', delta: -20 },
            { id: '', delta: 5 },
        ])).toEqual([{ id: 'b', delta: -50 }]);
    });

    it('invierte los cambios', () => {
        expect(invertBalanceChanges([{ id: 'a', delta: 10 }])).toEqual([{ id: 'a', delta: -10 }]);
    });
});

describe('adjustBalances', () => {
    beforeEach(() => rpc.mockReset());

    it('no llama a la RPC si no hay cambios', async () => {
        const result = await adjustBalances([{ id: 'a', delta: 0 }]);
        expect(result.size).toBe(0);
        expect(rpc).not.toHaveBeenCalled();
    });

    it('envía los cambios agrupados y devuelve los saldos', async () => {
        rpc.mockResolvedValue({ data: [{ id: 'a', balance: 900 }], error: null } as never);
        const result = await adjustBalances([{ id: 'a', delta: -60 }, { id: 'a', delta: -40 }]);
        expect(rpc).toHaveBeenCalledWith('adjust_balances', { p_changes: [{ id: 'a', delta: -100 }] });
        expect(result.get('a')).toBe(900);
    });

    it('propaga el error de la RPC', async () => {
        rpc.mockResolvedValue({ data: null, error: new Error('check violation') } as never);
        await expect(adjustBalances([{ id: 'a', delta: -1 }])).rejects.toThrow('check violation');
    });
});

describe('withBalanceChanges', () => {
    beforeEach(() => rpc.mockReset());

    it('revierte el saldo si la operación falla', async () => {
        rpc.mockResolvedValue({ data: [], error: null } as never);
        await expect(
            withBalanceChanges([{ id: 'a', delta: -100 }], async () => { throw new Error('insert failed'); })
        ).rejects.toThrow('insert failed');

        expect(rpc).toHaveBeenNthCalledWith(1, 'adjust_balances', { p_changes: [{ id: 'a', delta: -100 }] });
        expect(rpc).toHaveBeenNthCalledWith(2, 'adjust_balances', { p_changes: [{ id: 'a', delta: 100 }] });
    });

    it('no ejecuta la operación si el ajuste falla', async () => {
        rpc.mockResolvedValue({ data: null, error: new Error('saldo insuficiente') } as never);
        const operation = vi.fn();
        await expect(withBalanceChanges([{ id: 'a', delta: -100 }], operation)).rejects.toThrow('saldo insuficiente');
        expect(operation).not.toHaveBeenCalled();
    });
});
