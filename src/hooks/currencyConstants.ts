// Currency configuration with decimal places information
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  decimals: number; // Number of decimal places (e.g., 2 for USD, 0 for COP)
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'Dólar estadounidense ($)', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro (€)', symbol: '€', decimals: 2 },
  { code: 'COP', name: 'Peso colombiano (COP)', symbol: '$', decimals: 0 },
  { code: 'MXN', name: 'Peso mexicano (Mex$)', symbol: '$', decimals: 2 },
  { code: 'ARS', name: 'Peso argentino (ARS)', symbol: '$', decimals: 2 },
  { code: 'BRL', name: 'Real brasileño (R$)', symbol: 'R$', decimals: 2 },
  { code: 'CLP', name: 'Peso chileno (CLP)', symbol: '$', decimals: 0 },
  { code: 'PEN', name: 'Sol peruano (S/)', symbol: 'S/', decimals: 2 },
];

export const getCurrencyConfig = (currencyCode: string): CurrencyConfig => {
  return CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
};

export const getDefaultDecimals = (currencyCode: string): number => {
  const config = getCurrencyConfig(currencyCode);
  return config.decimals;
};
