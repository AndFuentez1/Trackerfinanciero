import * as XLSX from 'xlsx';
import { parse, isValid, format as formatDateFns } from 'date-fns';
import { TransactionType } from '@/features/finance/types/financeTypes';

export interface ParsedRow {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  isValid: boolean;
  error?: string;
  inferredType?: TransactionType;
}

export interface ColumnMapping {
  date: number | null;
  description: number | null;
  category: number | null;
  amount: number | null;
  paymentMethod: number | null;
}

export interface ColumnPreview {
  index: number;
  header: string;
  samples: string[];
}

export const categoryMap: Record<string, string> = {
  // Ingresos
  'salario': 'Salario',
  'nómina': 'Salario',
  'otros ingresos': 'Otros ingresos',
  'ingresos': 'Otros ingresos',

  // Gastos - Alimentación
  'alimentación': 'Alimentación',
  'comida': 'Alimentación',
  'alimentos': 'Alimentación',
  'mercado': 'Alimentación',
  'restaurantes': 'Restaurantes',
  'restaurante': 'Restaurantes',
  'mecato y bebidas': 'Mecato y bebidas',
  'mecato': 'Mecato y bebidas',

  // Transporte
  'transporte': 'Transporte',
  'cívica': 'Civica',
  'civica': 'Civica',
  'gasolina': 'Gasolina',
  'gas': 'Gasolina',
  'parqueadero': 'Parqueadero',
  'moto': 'Moto',

  // Vivienda y Hogar
  'arriendo y mudanzas': 'Arriendo y mudanzas',
  'arriendo': 'Arriendo y mudanzas',
  'aseo y limpieza': 'Aseo y limpieza',
  'limpieza': 'Aseo y limpieza',
  'utilería hogar y decoración': 'Utilería hogar y decoración',
  'hogar': 'Utilería hogar y decoración',

  // Salud y Cuidado
  'cuidado personal y estética': 'Cuidado personal y estética',
  'estética': 'Cuidado personal y estética',
  'salud y pensión': 'Salud y pensión',
  'farmacia y salud': 'Farmacia y Salud',
  'salud': 'Salud y pensión',
  'seguro de vida': 'Seguro de vida',
  'seguro moto': 'Seguro moto',

  // Otros Gastos
  'teléfono': 'Teléfono',
  'celular': 'Teléfono',
  'educación': 'Educación',
  'gym': 'Gym',
  'gimnasio': 'Gym',
  'oficina y trabajo': 'Oficina y trabajo',
  'salidas, hospedajes y ocio': 'Salidas, hospedajes y ocio',
  'viajes': 'Salidas, hospedajes y ocio',
  'aplicativos, libros y gadgets': 'Aplicativos, libros y gadgets',
  'ropa, calzado y accesorios': 'Ropa, calzado y accesorios',
  'ropa': 'Ropa, calzado y accesorios',
  'regalos': 'Regalos',
  'utilería oficina': 'Utilería oficina',
  'documentos y papelería': 'Documentos y papelería',
  'grandes activos': 'Grandes activos',
  'reparaciones': 'Reparaciones',
  'préstamos': 'Préstamos',
  'impuestos y multas': 'Impuestos y multas',

  // Ahorro e Inversión
  'ahorro': 'Ahorro',
  'acciones': 'Acciones',
  'cdt': 'CDT',

  // General
  'otro': 'Otro',
  'otros': 'Otro',
};

export const parseCategory = (value: string): string => {
  const normalized = value.toLowerCase().trim();
  return categoryMap[normalized] || value || 'Otro';
};

export const parseDate = (value: string | number): string | null => {
  if (typeof value === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(value);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const parsed = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
        if (isValid(parsed)) {
          return formatDateFns(parsed, 'yyyy-MM-dd');
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  if (!value || typeof value !== 'string') { return null; }

  const str = value.trim().split(/[T\s]/)[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parse(str, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? str : null;
  }

  const formats = [
    'dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy',
    'dd.MM.yyyy', 'd.M.yyyy', 'MM/dd/yyyy', 'M/d/yyyy',
  ];

  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) {
      return formatDateFns(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
};

export const parseAmountSample = (rawValue: string): number | null => {
  const val = rawValue.replace(/\$/g, '').trim();
  if (!val) { return null; }

  const lastCommaIdx = val.lastIndexOf(',');
  const lastPeriodIdx = val.lastIndexOf('.');

  if (lastCommaIdx === -1 && lastPeriodIdx === -1) {
    const parsed = parseFloat(val);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (lastCommaIdx > lastPeriodIdx) {
    const parsed = parseFloat(val.replace(/\./g, '').replace(/,/, '.'));
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (lastPeriodIdx > lastCommaIdx) {
    const parsed = parseFloat(val.replace(/,/g, ''));
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (lastCommaIdx !== -1) {
    const beforeComma = val.substring(0, lastCommaIdx).replace(/\./g, '');
    const afterComma = val.substring(lastCommaIdx + 1);
    const normalized = afterComma.length > 2
      ? beforeComma + afterComma
      : beforeComma + '.' + afterComma;
    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const beforePeriod = val.substring(0, lastPeriodIdx).replace(/,/g, '');
  const afterPeriod = val.substring(lastPeriodIdx + 1);
  const normalized = afterPeriod.length <= 3 ? beforePeriod + '.' + afterPeriod : beforePeriod + afterPeriod;
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const findBestSheet = (workbook: XLSX.WorkBook): string => {
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 1) return sheetNames[0];

  const keywords = ['transaccion', 'movimiento', 'finanza', 'gasto', 'ingreso', 'datos', 'principal'];
  for (const keyword of keywords) {
    const match = sheetNames.find(name => name.toLowerCase().includes(keyword));
    if (match) return match;
  }

  let maxRows = 0;
  let bestSheet = sheetNames[0];

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    if (data.length > maxRows) {
      maxRows = data.length;
      bestSheet = sheetName;
    }
  }

  return bestSheet;
};

export const autoDetectMapping = (headers: unknown[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    date: null, description: null, category: null, amount: null, paymentMethod: null,
  };

  headers.forEach((header, index) => {
    const headerStr = String(header || '').toLowerCase().trim();
    if (headerStr.includes('fecha') || headerStr.includes('date')) {
      mapping.date = index;
    } else if (headerStr.includes('descripci') || headerStr.includes('description') || headerStr.includes('concepto')) {
      mapping.description = index;
    } else if (headerStr.includes('categor') || headerStr.includes('category') || headerStr.includes('tipo')) {
      mapping.category = index;
    } else if (headerStr.includes('valor') || headerStr.includes('monto') || headerStr.includes('amount') || headerStr.includes('precio') || headerStr.includes('importe')) {
      mapping.amount = index;
    } else if (headerStr.includes('metodo') || headerStr.includes('method') || headerStr.includes('pago') || headerStr.includes('payment')) {
      mapping.paymentMethod = index;
    }
  });

  return mapping;
};
