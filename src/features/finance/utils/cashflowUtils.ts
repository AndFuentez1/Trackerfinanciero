/**
 * Utilidades compartidas para flujo de caja.
 * Garantiza que Dashboard y CashFlow usen el mismo criterio:
 * las transferencias entre cuentas propias no inflan ingresos ni gastos.
 */
export type TransactionLike = { type: string; category?: string | null };

const TRANSFER_TYPES = ['transfer_in', 'transfer_out', 'transfer'] as const;
const TRANSFER_CATEGORY_PATTERN = /transferencia|transfer/i;

export function isTransferTransaction(t: TransactionLike): boolean {
  if (TRANSFER_TYPES.includes(t.type as (typeof TRANSFER_TYPES)[number])) { return true; }
  if (t.category && TRANSFER_CATEGORY_PATTERN.test(t.category)) { return true; }
  return false;
}

/** Categoría con la que se registran los cambios manuales de saldo de un método de pago. */
export const BALANCE_ADJUSTMENT_CATEGORY = 'Ajuste de saldo';

/**
 * Ajuste manual de saldo (p. ej. corregir la deuda de una tarjeta).
 * Mueve el saldo y se muestra en el flujo de caja, pero no es un ingreso/gasto real.
 */
export function isBalanceAdjustment(t: TransactionLike): boolean {
  return (t.category ?? '').trim().toLowerCase() === BALANCE_ADJUSTMENT_CATEGORY.toLowerCase();
}

export function excludeTransfers<T extends TransactionLike>(transactions: T[]): T[] {
  return transactions.filter(t => !isTransferTransaction(t));
}

