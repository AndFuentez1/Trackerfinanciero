// Currency configuration with decimal places information
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number; // Number of decimal places (e.g., 2 for USD, 0 for COP)
  usageCount?: number; // Sorting weight for popularity
}

/** Locale por defecto para formateo (evita strings mágicos "es-CO" en toda la app) */
export const DEFAULT_LOCALE = 'es-CO' as const;

/** Código de moneda por defecto cuando el usuario no ha configurado (evita "COP" repetido) */
export const DEFAULT_CURRENCY_CODE = 'COP' as const;

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'COP', name: 'Peso colombiano', symbol: 'COP', decimals: 0 },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£', decimals: 2 },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Yuan chino', symbol: '¥', decimals: 2 },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'CA$', decimals: 2 },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'AU$', decimals: 2 },
  { code: 'CHF', name: 'Franco suizo', symbol: 'CHF', decimals: 2 },
  { code: 'HKD', name: 'Dólar de Hong Kong', symbol: 'HK$', decimals: 2 },
  { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$', decimals: 2 },
  { code: 'SEK', name: 'Corona sueca', symbol: 'kr', decimals: 2 },
  { code: 'KRW', name: 'Won surcoreano', symbol: '₩', decimals: 0 },
  { code: 'SGD', name: 'Dólar de Singapur', symbol: 'S$', decimals: 2 },
  { code: 'NOK', name: 'Corona noruega', symbol: 'kr', decimals: 2 },
  { code: 'MXN', name: 'Peso mexicano', symbol: 'Mex$', decimals: 2 },
  { code: 'INR', name: 'Rupia india', symbol: '₹', decimals: 2 },
  { code: 'RUB', name: 'Rublo ruso', symbol: '₽', decimals: 2 },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R', decimals: 2 },
  { code: 'TRY', name: 'Lira turca', symbol: '₺', decimals: 2 },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$', decimals: 2 },
  { code: 'TWD', name: 'Nuevo dólar taiwanés', symbol: 'NT$', decimals: 2 },
  { code: 'DKK', name: 'Corona danesa', symbol: 'kr', decimals: 2 },
  { code: 'PLN', name: 'Zloty polaco', symbol: 'zł', decimals: 2 },
  { code: 'THB', name: 'Baht tailandés', symbol: '฿', decimals: 2 },
  { code: 'IDR', name: 'Rupia indonesia', symbol: 'Rp', decimals: 0 },
  { code: 'HUF', name: 'Fórimo húngaro', symbol: 'Ft', decimals: 0 },
  { code: 'CZK', name: 'Corona checa', symbol: 'Kč', decimals: 2 },
  { code: 'ILS', name: 'Nuevo shéquel israelí', symbol: '₪', decimals: 2 },
  { code: 'CLP', name: 'Peso chileno', symbol: 'CLP', decimals: 0 },
  { code: 'PHP', name: 'Peso filipino', symbol: '₱', decimals: 2 },
  { code: 'AED', name: 'Dírham de EAU', symbol: 'AED', decimals: 2 },
  { code: 'SAR', name: 'Riyal saudí', symbol: 'SAR', decimals: 2 },
  { code: 'MYR', name: 'Ringgit malayo', symbol: 'RM', decimals: 2 },
  { code: 'RON', name: 'Leu rumano', symbol: 'lei', decimals: 2 },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/', decimals: 2 },
  { code: 'ARS', name: 'Peso argentino', symbol: 'ARS', decimals: 2 },
];

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  return CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
};

export const getDefaultDecimals = (currencyCode: string): number => {
  const config = getCurrencyConfig(currencyCode);
  return config.decimals;
};
