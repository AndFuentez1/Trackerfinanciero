import { describe, it, expect } from 'vitest';
import { isBalanceAdjustment, isTransferTransaction } from './cashflowUtils';

describe('cashflowUtils', () => {
  it('detects balance adjustments by category (case-insensitive)', () => {
    expect(isBalanceAdjustment({ type: 'income', category: 'Ajuste de saldo' })).toBe(true);
    expect(isBalanceAdjustment({ type: 'expense', category: ' ajuste DE saldo ' })).toBe(true);
    expect(isBalanceAdjustment({ type: 'income', category: 'Salario' })).toBe(false);
    expect(isBalanceAdjustment({ type: 'income', category: null })).toBe(false);
  });

  it('does not treat adjustments as transfers', () => {
    expect(isTransferTransaction({ type: 'income', category: 'Ajuste de saldo' })).toBe(false);
    expect(isTransferTransaction({ type: 'transfer_in', category: null })).toBe(true);
  });
});
