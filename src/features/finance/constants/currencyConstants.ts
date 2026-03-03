// Currency configuration with decimal places information
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number; // Number of decimal places (e.g., 2 for USD, 0 for COP)
}

/** Locale por defecto para formateo (evita strings mágicos "es-CO" en toda la app) */
export const DEFAULT_LOCALE = 'es-CO' as const;

/** Código de moneda por defecto cuando el usuario no ha configurado (evita "COP" repetido) */
export const DEFAULT_CURRENCY_CODE = 'COP' as const;

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'Dólar estadounidense ($)', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro (€)', symbol: '€', decimals: 2 },
  { code: 'COP', name: 'Peso colombiano (COP)', symbol: 'COP', decimals: 0 },
  { code: 'MXN', name: 'Peso mexicano (Mex$)', symbol: 'Mex$', decimals: 2 },
  { code: 'ARS', name: 'Peso argentino (ARS)', symbol: 'ARS', decimals: 2 },
  { code: 'BRL', name: 'Real brasileño (R$)', symbol: 'R$', decimals: 2 },
  { code: 'CLP', name: 'Peso chileno (CLP)', symbol: 'CLP', decimals: 0 },
  { code: 'PEN', name: 'Sol peruano (S/)', symbol: 'S/', decimals: 2 },
];

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  return CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
};

export const getDefaultDecimals = (currencyCode: string): number => {
  const config = getCurrencyConfig(currencyCode);
  return config.decimals;
};
