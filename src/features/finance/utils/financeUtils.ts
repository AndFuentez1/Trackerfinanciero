import type { PaymentMethod } from '../types/financeTypes';

export {
  calculateSummary,
  calculateExpensesByCategory,
  calculateInsights,
} from './financeCalculations';

export { excludeTransfers } from '@/features/finance/utils/cashflowUtils';

export const calculateCurrentRealBalance = (paymentMethods: PaymentMethod[]) => {
  return paymentMethods.reduce((sum, pm) => {
    const balance = pm.balance || 0;
    if (pm.type === 'credit') {
      return sum - balance;
    }
    return sum + balance;
  }, 0);
};
