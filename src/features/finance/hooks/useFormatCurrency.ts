import { useFinance } from '@/features/finance/context/FinanceContext';
import { formatCurrency as formatCurrencyUtil, formatCurrencySmall as formatCurrencySmallUtil } from '@/core/utils';
import type React from 'react';
import { DEFAULT_CURRENCY_CODE } from '@/features/finance/constants/currencyConstants';

/**
 * Hook que proporciona formatCurrency y formatCurrencySmall con la moneda del usuario
 */
export const useFormatCurrency = () => {
  const { currency, decimalPlaces } = useFinance();
  
  const formatCurrency = (value: number, decimals?: number) => {
    return formatCurrencyUtil(value, decimals ?? decimalPlaces ?? 2, currency || DEFAULT_CURRENCY_CODE);
  };
  
  const formatCurrencySmall = (value: number, decimals?: number): React.ReactNode => {
    return formatCurrencySmallUtil(value, decimals ?? decimalPlaces ?? 2, currency || DEFAULT_CURRENCY_CODE);
  };
  
  return { formatCurrency, formatCurrencySmall, currency, decimalPlaces };
};

