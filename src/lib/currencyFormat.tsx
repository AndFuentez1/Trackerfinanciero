import React from 'react';

/**
 * Formatea un número de moneda con decimales 40% más pequeños
 * @param value Valor numérico a formatear
 * @param decimalPlaces Cantidad de decimales a mostrar
 * @returns JSX con el formato aplicado
 */
export function formatCurrencyWithSmallDecimals(value: number, decimalPlaces: number): JSX.Element {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);

  // Si no hay decimales configurados, retornar el valor completo
  if (decimalPlaces === 0) {
    return <span>{formatted}</span>;
  }

  // Separar símbolo, parte entera y decimales
  const parts = formatted.split(',');
  
  if (parts.length === 1) {
    // No hay decimales en el formato
    return <span>{formatted}</span>;
  }

  const integerPart = parts[0]; // "$1.000"
  const decimalPart = parts[1]; // "00"

  return (
    <span>
      {integerPart}
      <span className="opacity-60" style={{ fontSize: '0.6em' }}>,{decimalPart}</span>
    </span>
  );
}

/**
 * Versión inline que retorna string para casos donde no se puede usar JSX
 */
export function formatCurrencyString(value: number, decimalPlaces: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}
