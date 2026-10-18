import type { PaymentMethod } from '../types/financeTypes';

export {
  calculateSummary,
  calculateExpensesByCategory,
  calculateInsights,
} from './financeCalculations';

export { excludeTransfers } from '@/features/finance/utils/cashflowUtils';
export { getCreditDebt, getAvailableCredit } from './creditCardUtils';

/** Patrimonio actual = suma de balances; la deuda de tarjetas ya es negativa. */
export const calculateCurrentRealBalance = (paymentMethods: PaymentMethod[]) => {
  return paymentMethods.reduce((sum, pm) => sum + (pm.balance || 0), 0);
};
