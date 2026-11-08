import { supabase } from '@/integrations/supabase/client';

// `type` (no `interface`) para que sea asignable al tipo Json de la RPC.
export type BalanceChange = {
    id: string;
    delta: number;
};

const POSITIVE_TYPES = new Set(['income', 'transfer_in']);

/**
 * Efecto de una transacción en el saldo de su cuenta.
 * Ingresos y transferencias recibidas suman; todo lo demás resta. Se usa el valor
 * absoluto porque algunas transacciones (p. ej. transfer_out) se guardan con signo negativo.
 */
export function balanceDeltaFor(type: string | null | undefined, amount: number | string | null | undefined): number {
    const absAmount = Math.abs(Number(amount) || 0);
    return POSITIVE_TYPES.has(type ?? '') ? absAmount : -absAmount;
}

/** Une los cambios de una misma cuenta y quita los que no mueven saldo. */
export function mergeBalanceChanges(changes: BalanceChange[]): BalanceChange[] {
    const totals = new Map<string, number>();
    changes.forEach(({ id, delta }) => {
        if (!id) { return; }
        totals.set(id, (totals.get(id) ?? 0) + delta);
    });
    return Array.from(totals, ([id, delta]) => ({ id, delta })).filter(c => c.delta !== 0);
}

export function invertBalanceChanges(changes: BalanceChange[]): BalanceChange[] {
    return changes.map(({ id, delta }) => ({ id, delta: -delta }));
}

/**
 * Aplica los cambios de saldo en el servidor (RPC adjust_balances): todo o nada, sin
 * condiciones de carrera. Devuelve el saldo resultante por cuenta.
 */
export async function adjustBalances(changes: BalanceChange[]): Promise<Map<string, number>> {
    const merged = mergeBalanceChanges(changes);
    const result = new Map<string, number>();
    if (merged.length === 0) { return result; }

    const { data, error } = await supabase.rpc('adjust_balances', { p_changes: merged });
    if (error) {
        // 23514 = CHECK (type = 'credit' OR balance >= 0): la cuenta quedaría en negativo.
        if (error.code === '23514') {
            throw new Error('Saldo insuficiente: la operación dejaría la cuenta en negativo.');
        }
        throw error;
    }

    (data ?? []).forEach(row => result.set(row.id, Number(row.balance)));
    return result;
}

export type DeletePaymentMethodOption = 'delete' | 'orphan' | 'transfer';

/**
 * Elimina un método de pago o cuenta de ahorro en una sola transacción (RPC
 * delete_payment_method). Con 'transfer', historial, préstamos y saldo pasan a la cuenta destino.
 */
export async function deletePaymentMethodAtomic(
    id: string,
    option: DeletePaymentMethodOption,
    transferToId?: string
): Promise<void> {
    if (option === 'transfer' && !transferToId) {
        throw new Error('Selecciona la cuenta destino para transferir el saldo.');
    }
    const { error } = await supabase.rpc('delete_payment_method', {
        p_id: id,
        p_option: option,
        p_transfer_to_id: option === 'transfer' ? transferToId : null,
    });
    if (error) {
        if (error.code === '23514') {
            throw new Error('La cuenta destino quedaría en negativo; elige otra cuenta.');
        }
        throw error;
    }
}

/**
 * Ejecuta `operation` con los saldos ya ajustados; si la operación falla, revierte los
 * saldos y relanza el error.
 */
export async function withBalanceChanges<T>(
    changes: BalanceChange[],
    operation: (balances: Map<string, number>) => Promise<T>
): Promise<T> {
    const merged = mergeBalanceChanges(changes);
    const balances = await adjustBalances(merged);
    try {
        return await operation(balances);
    } catch (error) {
        try {
            await adjustBalances(invertBalanceChanges(merged));
        } catch {
            // Si también falla la reversión, el error original es el que importa al usuario.
        }
        throw error;
    }
}
