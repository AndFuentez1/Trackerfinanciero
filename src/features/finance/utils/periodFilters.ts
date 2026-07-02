export interface BudgetPeriodScopeOptions {
  year: number;
  month: number;
  selectedYear: number | 'all';
  selectedMonth: number | 'all' | 'active';
  today?: Date;
}

export function isBudgetMonthInScope({
  year,
  month,
  selectedYear,
  selectedMonth,
  today = new Date(),
}: BudgetPeriodScopeOptions) {
  if (selectedYear !== 'all' && year !== selectedYear) {
    return false;
  }

  if (selectedMonth === 'all') {
    return true;
  }

  if (selectedMonth === 'active') {
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (year < currentYear) {
      return true;
    }

    if (year === currentYear && month <= currentMonth) {
      return true;
    }

    return false;
  }

  return month === selectedMonth;
}

export function isLoanPendingDisbursement(loan: { is_disbursed?: boolean | null; payment_method_id?: string | null }) {
  return !loan.is_disbursed && !loan.payment_method_id;
}
