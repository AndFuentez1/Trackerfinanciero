/**
 * Utilidades de manejo de fechas en zona horaria local
 * para evitar desfases por conversión a UTC
 */

/**
 * Obtiene la fecha actual en formato yyyy-MM-dd usando la zona horaria local
 * (NO UTC, evita desfase de días)
 * 
 * @example
 * // Usuario en Colombia (UTC-5) a las 21:00 del 22 de enero
 * getTodayLocalDate() // "2026-01-22" ✓ (correcto)
 * // vs
 * new Date().toISOString().split('T')[0] // "2026-01-23" ✗ (día siguiente)
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha Date a string yyyy-MM-dd en zona horaria local
 * 
 * @param date - Fecha a formatear
 * @returns String en formato yyyy-MM-dd
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea string yyyy-MM-dd como fecha local (NO UTC)
 * Valida que la fecha sea válida y retorna null si no lo es
 * 
 * @param dateStr - String en formato yyyy-MM-dd
 * @returns Date object o null si es inválido
 * 
 * @example
 * parseLocalDate("2026-01-22") // Date object válido
 * parseLocalDate("2026-13-45") // null (fecha inválida)
 * parseLocalDate("invalid") // null (formato incorrecto)
 */
export function parseLocalDate(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {return null;}
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validar que la fecha sea válida (detecta casos como 2026-02-30)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  
  return date;
}

/**
 * Obtiene el primer día del mes actual en formato yyyy-MM-dd
 */
export function getFirstDayOfCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Obtiene el último día del mes actual en formato yyyy-MM-dd
 */
export function getLastDayOfCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  return `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
}
