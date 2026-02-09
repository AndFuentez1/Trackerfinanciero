import { useFinance } from '@/features/finance/context/FinanceContext';
import { formatCurrency as formatCurrencyUtil, formatCurrencySmall as formatCurrencySmallUtil } from '@/core/utils';
import React from 'react';

/**
 * Hook que proporciona formatCurrency y formatCurrencySmall con la moneda del usuario
 */
export const useFormatCurrency = () => {
  const { currency, decimalPlaces } = useFinance();
  
  const formatCurrency = (value: number, decimals?: number) => {
    return formatCurrencyUtil(value, decimals ?? decimalPlaces ?? 2, currency || 'COP');
  };
  
  const formatCurrencySmall = (value: number, decimals?: number): React.ReactNode => {
    return formatCurrencySmallUtil(value, decimals ?? decimalPlaces ?? 2, currency || 'COP');
  };
  
  return { formatCurrency, formatCurrencySmall, currency, decimalPlaces };
};

