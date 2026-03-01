import { describe, it, expect } from 'vitest';
import { mapTransactionRow, mapPaymentMethodRow, mapBudgetRow } from './transactionMappers';

describe('transactionMappers', () => {
  it('maps transaction row accurately', () => {
    const row = {
      id: '1',
      type: 'expense',
      category: 'Food',
      category_id: 'c1',
      amount: 100,
      description: 'Lunch',
      date: '2023-01-01',
      payment_method_id: 'p1',
      created_at: '2023',
      user_id: 'u1'
    } as any;
    
    const result = mapTransactionRow(row);
    expect(result.id).toBe('1');
    expect(result.type).toBe('expense');
    expect(result.amount).toBe(100);
  });

  it('resolves transfer_in and transfer_out correcty', () => {
    const transferOutRow = { type: 'transfer', category: 'Transferencia Enviada', amount: 50 };
    expect(mapTransactionRow(transferOutRow as any).type).toBe('transfer_out');
    
    const transferInRow = { type: 'transfer', category: 'Transferencia Recibida', amount: 50 };
    expect(mapTransactionRow(transferInRow as any).type).toBe('transfer_in');
  });

  it('handles optional installments', () => {
    const row = { type: 'expense', amount: 100, installments: 3 };
    const result = mapTransactionRow(row as any);
    expect(result.installments).toBe(3);
  });

  it('maps payment method row', () => {
    const row = {
      id: 'p1',
      name: 'Bank',
      type: 'debit',
      balance: 1000,
      credit_limit: null,
      color: '#fff',
      savings_goal: 500,
      user_id: 'u1',
      created_at: 'date',
      updated_at: 'date'
    } as any;

    const pm = mapPaymentMethodRow(row);
    expect(pm.balance).toBe(1000);
    expect(pm.savings_goal).toBe(500);
    expect(pm.credit_limit).toBeNull();
  });

  it('maps credit limit if available', () => {
    const row = { id: 'p1', type: 'credit', balance: 0, credit_limit: 5000 };
    const pm = mapPaymentMethodRow(row as any);
    expect(pm.credit_limit).toBe(5000);
  });

  it('maps budget row', () => {
    const row = {
      id: 'b1',
      category: 'Food',
      category_id: null,
      amount: 200,
      month: '2023-01',
      user_id: 'u1',
      created_at: 'date',
      updated_at: 'date'
    } as any;

    const b = mapBudgetRow(row);
    expect(b.id).toBe('b1');
    expect(b.amount).toBe(200);
    expect(b.month).toBe('2023-01');
  });
});
