/**
 * Convención de tarjetas de crédito: la deuda es un balance NEGATIVO.
 * Una compra resta del balance y un pago lo acerca a 0.
 * Un balance >= 0 significa que la tarjeta no tiene deuda pendiente.
 */
export const getCreditDebt = (balance: number | null | undefined): number => {
  const value = Number(balance ?? 0);
  return Number.isFinite(value) ? Math.max(0, -value) : 0;
};

/** Crédito disponible = límite − deuda (nunca negativo). */
export const getAvailableCredit = (
  creditLimit: number | null | undefined,
  balance: number | null | undefined
): number => Math.max(0, Number(creditLimit ?? 0) - getCreditDebt(balance));
