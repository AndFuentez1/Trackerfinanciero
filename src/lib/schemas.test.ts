import { describe, expect, it } from 'vitest';
import { budgetSchema } from './schemas';

describe('budgetSchema', () => {
  it('allows creating a budget with zero amount', () => {
    const result = budgetSchema.safeParse({
      category_id: 'category-1',
      category: 'Comida',
      amount: 0,
      is_recurrent: false,
      month: '2026-07',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(0);
    }
  });
});
