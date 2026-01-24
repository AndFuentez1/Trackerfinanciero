import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from 'react';
import { CURRENCIES } from '@/hooks/currencyConstants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
};

export const formatCurrency = (value: number, decimals: number = 2, currencyCode: string = 'COP') => {
  const symbol = getCurrencySymbol(currencyCode);
  
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    currencyDisplay: 'code',
  }).format(value);
  
  // Reemplazamos el código de moneda con nuestro símbolo personalizado
  return formatted.replace(currencyCode, symbol);
};

/**
 * Formatea moneda con decimales reducidos a 40% del tamaño (para presupuestos, ahorros, préstamos)
 */
export const formatCurrencySmall = (value: number, decimals: number = 2, currencyCode: string = 'COP'): React.ReactNode => {
  const symbol = getCurrencySymbol(currencyCode);
  
  let formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    currencyDisplay: 'code',
  }).format(value);
  
  // Reemplazamos el código de moneda con nuestro símbolo personalizado
  formatted = formatted.replace(currencyCode, symbol);

  if (decimals === 0) return formatted;

  // Separar símbolo, parte entera y decimales
  const parts = formatted.split(',');
  if (parts.length === 1) return formatted;

  const integerPart = parts[0]; // "$1.000"
  const decimalPart = parts[1]; // "00"

  return React.createElement(
    'span',
    null,
    integerPart,
    React.createElement('span', { className: 'opacity-60', style: { fontSize: '0.4em' } }, `,${decimalPart}`)
  );
};
