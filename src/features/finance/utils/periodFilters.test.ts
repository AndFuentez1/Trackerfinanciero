import { describe, expect, it } from 'vitest';
import { isBudgetMonthInScope, isLoanPendingDisbursement } from './periodFilters';

describe('periodFilters', () => {
  it('includes only months up to the current month for the active range in the current year', () => {
    const today = new Date(2024, 3, 10);

    expect(isBudgetMonthInScope({ year: 2024, month: 3, selectedYear: 2024, selectedMonth: 'active', today })).toBe(true);
    expect(isBudgetMonthInScope({ year: 2024, month: 4, selectedYear: 2024, selectedMonth: 'active', today })).toBe(true);
    expect(isBudgetMonthInScope({ year: 2024, month: 5, selectedYear: 2024, selectedMonth: 'active', today })).toBe(false);
  });

  it('excludes months from a different selected year when the active range is selected', () => {
    const today = new Date(2024, 3, 10);

    expect(isBudgetMonthInScope({ year: 2023, month: 12, selectedYear: 2024, selectedMonth: 'active', today })).toBe(false);
  });
});

describe('isLoanPendingDisbursement', () => {
  it('treats loans without disbursement and without a payment method as pending', () => {
    expect(isLoanPendingDisbursement({ is_disbursed: false, payment_method_id: null })).toBe(true);
    expect(isLoanPendingDisbursement({ is_disbursed: undefined, payment_method_id: null })).toBe(true);
    expect(isLoanPendingDisbursement({ is_disbursed: true, payment_method_id: null })).toBe(false);
    expect(isLoanPendingDisbursement({ is_disbursed: true, payment_method_id: 'pm-1' })).toBe(false);
  });
});
