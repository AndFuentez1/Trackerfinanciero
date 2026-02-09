import { useState, useRef } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '@/features/finance/types/financeTypes';
import { MASTER_PALETTE } from '@/features/finance/hooks/useFinanceDataLogic';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/core/utils';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parse, isValid, format as formatDateFns } from 'date-fns';

interface ImportExcelDialogProps {
  paymentMethods: PaymentMethod[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error?: unknown; count: number }>;
  onImportBackground?: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error?: unknown; count: number }>; // Para correr en segundo plano
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTriggerButton?: boolean; // Si false, no muestra el botón DialogTrigger
  onboarding?: boolean; // Si true, no inserta directamente, deja que onImport maneje
}

interface ParsedRow {
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod?: string;
  isValid: boolean;
  error?: string;
  inferredType?: TransactionType;
}

interface ColumnMapping {
  date: number | null;
  description: number | null;
  category: number | null;
  amount: number | null;
  paymentMethod: number | null;
}

interface ColumnPreview {
  index: number;
  header: string;
  samples: string[];
}

// Map keywords to standardized database category names (defaults)
const categoryMap: Record<string, string> = {
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

const parseCategory = (value: string): string => {
  const normalized = value.toLowerCase().trim();
  return categoryMap[normalized] || value || 'Otro';
};

const parseDate = (value: string | number): string | null => {
  // Excel serial number
  if (typeof value === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(value);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        // Validar que la fecha sea válida antes de retornar
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

  if (!value || typeof value !== 'string') return null;

  // Remove time / timezone parts if present (e.g., 2026-01-05T03:00:00Z or 05/01/2026 10:00)
  const str = value.trim().split(/[T\s]/)[0];

  // Direct ISO yyyy-MM-dd - validar que sea fecha real
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parse(str, 'yyyy-MM-dd', new Date());
    return isValid(parsed) ? str : null;
  }

  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd-MM-yyyy',
    'd-M-yyyy',
    'dd.MM.yyyy',
    'd.M.yyyy',
    'MM/dd/yyyy',
    'M/d/yyyy',
  ];

  for (const fmt of formats) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) {
      return formatDateFns(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
};

export function ImportExcelDialog({
  paymentMethods,
  onImport,
  onImportBackground,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  showTriggerButton = true,
  onboarding = false
}: ImportExcelDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency, decimalPlaces } = useFinance();

  const getCurrencySymbol = () => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return curr?.symbol || currency || '$';
  };

  const getExampleAmountDisplay = () => {
    if (decimalPlaces > 0) {
      const decimals = '0'.repeat(decimalPlaces);
      return (
        <>
          {getCurrencySymbol()} 500
          <span style={{ fontSize: '0.8em', opacity: 0.75 }}>.{decimals}</span>
        </>
      );
    }
    return `${getCurrencySymbol()} 500`;
  };

  const [internalOpen, setInternalOpen] = useState(false);

  // Usar estado externo si se proporciona, sino usar estado interno
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (externalOnOpenChange) {
      externalOnOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbookData, setWorkbookData] = useState<XLSX.WorkBook | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    date: null,
    description: null,
    category: null,
    amount: null,
    paymentMethod: null,
  });
  const [columnPreviews, setColumnPreviews] = useState<ColumnPreview[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [showMappingStep, setShowMappingStep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Función auxiliar para seleccionar la mejor hoja automáticamente
  const findBestSheet = (workbook: XLSX.WorkBook): string => {
    const sheetNames = workbook.SheetNames;

    if (sheetNames.length === 1) {
      return sheetNames[0];
    }

    // Palabras clave que indican una hoja de transacciones
    const keywords = ['transaccion', 'movimiento', 'finanza', 'gasto', 'ingreso', 'datos', 'principal'];

    for (const keyword of keywords) {
      const match = sheetNames.find(name =>
        name.toLowerCase().includes(keyword)
      );
      if (match) return match;
    }

    // Buscar la hoja con más datos
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

  // Función para detectar automáticamente el mapeo de columnas
  const autoDetectMapping = (headers: unknown[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      date: null,
      description: null,
      category: null,
      amount: null,
      paymentMethod: null,
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

  // Función para procesar una hoja específica
  const processSheet = (workbook: XLSX.WorkBook, sheetName: string, mapping?: ColumnMapping) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (jsonData.length === 0) {
      setParsedRows([]);
      return;
    }

    // Si no hay mapeo, mostrar paso de mapeo
    if (!mapping) {
      const firstRow = jsonData[0] as unknown[];
      const previews: ColumnPreview[] = firstRow.map((header, index) => ({
        index,
        header: String(header || `Columna ${index + 1}`),
        samples: jsonData.slice(1, 4).map(row => String((row as unknown[])[index] || '')).filter(s => s),
      }));

      setColumnPreviews(previews);

      // Detectar automáticamente
      const detectedMapping = autoDetectMapping(firstRow);
      setColumnMapping(detectedMapping);

      setShowMappingStep(true);
      return;
    }

    // Procesar con el mapeo proporcionado
    const startRow = hasHeader ? 1 : 0;
    const rows = jsonData.slice(startRow).filter(row => Array.isArray(row) && row.length > 0) as unknown[][];

    const MAX_AMOUNT = 9999999999.99; // Límite de la base de datos (10^10 - 0.01)

    const parsed: ParsedRow[] = rows.map((row: unknown[]) => {
      const rawDate = mapping.date !== null ? row[mapping.date] : undefined;
      const date = parseDate((typeof rawDate === 'string' || typeof rawDate === 'number') ? rawDate : '');
      const description = mapping.description !== null ? String(row[mapping.description] || '').trim() : '';
      const category = mapping.category !== null ? String(row[mapping.category] || '').trim() : '';
      const rawValue = mapping.amount !== null ? String(row[mapping.amount] || '0').trim() : '0';

      // Parse numeric values correctly handling different locale formats
      // Supports: 1000.50, 1.000,50, 1,000.50, etc.
      const cleanValue = (() => {
        const val = rawValue.replace(/\$/g, '').trim();

        // Determine which is the decimal separator
        // If there's both comma and period, the last one is the decimal separator
        const lastCommaIdx = val.lastIndexOf(',');
        const lastPeriodIdx = val.lastIndexOf('.');

        if (lastCommaIdx === -1 && lastPeriodIdx === -1) {
          // No separators, it's an integer
          return val;
        } else if (lastCommaIdx > lastPeriodIdx) {
          // Comma is the decimal separator (European format: 1.000,50)
          return val.replace(/\./g, '').replace(/,/, '.');
        } else if (lastPeriodIdx > lastCommaIdx) {
          // Period is the decimal separator (US format: 1,000.50)
          return val.replace(/,/g, '');
        } else {
          // Single separator
          if (lastCommaIdx !== -1) {
            // Only comma
            const beforeComma = val.substring(0, lastCommaIdx).replace(/\./g, '');
            const afterComma = val.substring(lastCommaIdx + 1);
            // If after comma has more than 2 digits, it's thousands separator
            return afterComma.length > 2
              ? beforeComma + afterComma
              : beforeComma + '.' + afterComma;
          } else {
            // Only period
            const beforePeriod = val.substring(0, lastPeriodIdx).replace(/,/g, '');
            const afterPeriod = val.substring(lastPeriodIdx + 1);
            // If after period has exactly 2-3 digits and nothing after, it could be decimal
            return afterPeriod.length <= 3 ? beforePeriod + '.' + afterPeriod : beforePeriod + afterPeriod;
          }
        }
      })();

      const amount = parseFloat(cleanValue);
      const absAmount = Math.abs(amount);
      const paymentMethod = mapping.paymentMethod !== null && row[mapping.paymentMethod]
        ? String(row[mapping.paymentMethod]).trim()
        : undefined;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!date) errors.push('Fecha inválida');
      if (!description) errors.push('Sin descripción');
      if (isNaN(amount) || amount === 0) errors.push('Monto inválido');

      // Solo advertir sobre montos excesivos, no rechazar
      if (absAmount > MAX_AMOUNT) {
        warnings.push(`Monto excesivo (${absAmount.toLocaleString()}) - Se truncará a ${MAX_AMOUNT.toLocaleString()} para revisión`);
      }

      return {
        date: date || '',
        description,
        category,
        amount: isNaN(amount) ? 0 : absAmount,
        paymentMethod,
        isValid: errors.length === 0,
        error: errors.length > 0 ? errors.join(', ') : warnings.length > 0 ? warnings.join(', ') : undefined,
        inferredType: undefined,
      };
    });

    setParsedRows(parsed);
    setShowMappingStep(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedRows([]);
    setShowMappingStep(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      setWorkbookData(workbook);
      setAvailableSheets(workbook.SheetNames);

      // Seleccionar automáticamente la mejor hoja
      const bestSheet = findBestSheet(workbook);
      setSelectedSheet(bestSheet);

      // Iniciar proceso de mapeo de columnas
      processSheet(workbook, bestSheet);

      // Notificar si hay múltiples hojas
      if (workbook.SheetNames.length > 1) {
        toast({
          title: "Hoja seleccionada",
          description: `Se seleccionó automáticamente "${bestSheet}". Puedes cambiarla si lo deseas.`,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Manejar cambio de hoja seleccionada
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setShowMappingStep(false);
    setParsedRows([]);
    if (workbookData) {
      processSheet(workbookData, sheetName);
    }
  };

  // Confirmar mapeo y procesar datos
  const handleConfirmMapping = () => {
    if (!workbookData || !selectedSheet) return;

    // Validar que al menos los campos requeridos estén mapeados
    if (columnMapping.date === null || columnMapping.description === null || columnMapping.amount === null) {
      toast({
        title: "Mapeo incompleto",
        description: "Debes asignar al menos las columnas: Fecha, Descripción y Monto",
        variant: "destructive",
      });
      return;
    }

    processSheet(workbookData, selectedSheet, columnMapping);
  };

  // Función auxiliar para obtener opciones de columnas disponibles
  const getAvailableColumns = (excludeIndex?: number | null) => {
    return columnPreviews.filter(col => {
      // Excluir la columna si ya está asignada a otro campo
      const isAssigned = Object.entries(columnMapping).some(
        ([key, value]) => value === col.index && value !== excludeIndex
      );
      return !isAssigned;
    });
  };

  const handleImport = async () => {
    if (!user) {
      alert("No autenticado");
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);

    // Guardar estado en localStorage para recuperar si la página se cierra
    const importKey = `import_${user.id}_${Date.now()}`;
    localStorage.setItem(importKey, JSON.stringify({
      startTime: Date.now(),
      validRows: validRows.length,
      completed: 0,
      state: 'in_progress'
    }));

    try {
      // 1. Fetch current categories and payment methods
      const [{ data: currentCategories }, { data: currentPaymentMethods }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('payment_methods').select('*').eq('user_id', user.id)
      ]);

      const catMap = new Map<string, string>((currentCategories || []).map(c => [c.name.toLowerCase(), String(c.id)]));
      const pmMap = new Map<string, string>((currentPaymentMethods || []).map(pm => [pm.name.toLowerCase(), String(pm.id)]));

      // Ensure special categories exist
      const specialCategories = [
        { name: 'Transferencia entre Cuentas', type: 'transfer' as TransactionType },
        { name: 'Rendimientos', type: 'income' as TransactionType }
      ];

      for (const specialCat of specialCategories) {
        if (!catMap.has(specialCat.name.toLowerCase())) {
          const colorToUse = MASTER_PALETTE[catMap.size % MASTER_PALETTE.length];
          const { data: newCat, error: catErr } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: specialCat.name,
              type: specialCat.type,
              color: colorToUse
            })
            .select()
            .single();

          if (!catErr && newCat) {
            catMap.set(specialCat.name.toLowerCase(), newCat.id);
          }
        }
      }

      // Detectar duplicados
      const duplicateCategories = new Set<string>();
      const duplicatePaymentMethods = new Set<string>();

      validRows.forEach(row => {
        const catName = row.category.trim();
        if (catName && catMap.has(catName.toLowerCase())) {
          duplicateCategories.add(catName);
        }

        if (row.paymentMethod) {
          const pmName = row.paymentMethod.trim();
          if (pmMap.has(pmName.toLowerCase())) {
            duplicatePaymentMethods.add(pmName);
          }
        }
      });

      // BLOQUEAR si hay duplicados
      if (duplicateCategories.size > 0 || duplicatePaymentMethods.size > 0) {
        const duplicatesList = [];

        if (duplicateCategories.size > 0) {
          duplicatesList.push(`Categorías duplicadas: ${duplicateCategories.size}`);
        }

        if (duplicatePaymentMethods.size > 0) {
          duplicatesList.push(`Métodos de pago duplicados: ${duplicatePaymentMethods.size}`);
        }

        toast({
          title: "❌ Importación bloqueada",
          description: `${duplicatesList.join(', ')}. Elimina los duplicados del Excel y vuelve a intentarlo.`,
          variant: "destructive",
          duration: 10000,
        });

        setIsImporting(false);
        localStorage.removeItem(importKey);
        return { error: 'Duplicados detectados', count: 0 };
      }


      const transactionsToImport: Omit<Transaction, 'id'>[] = [];
      const errors: string[] = [];

      // Type translation / valid types
      const validTypes: string[] = ['income', 'expense', 'transfer_out', 'transfer_in', 'savings', 'investment'];
      const typeMap: Record<string, string> = {
        'ingreso': 'income', 'ingresos': 'income',
        'gasto': 'expense', 'gastos': 'expense',
        'transferencia': 'transfer_out', 'transfer': 'transfer_out',
        'ahorro': 'saving', 'ahorros': 'saving',
        'inversión': 'investment', 'inversion': 'investment',
        'préstamo': 'loan', 'prestamo': 'loan',
      };

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const rawCat = row.category.trim();
        const rawCatLower = rawCat.toLowerCase();

        // --- TYPE INFERENCE & NORMALIZATION ---
        let normalizedType: TransactionType = 'expense';

        if (['ingreso', 'salario', 'venta', 'honorarios', 'nómina', 'renta'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'income';
        } else if (['ahorro', 'cdt', 'inversión', 'inversion'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'saving';
        } else if (['prestamo', 'préstamo', 'deuda'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'loan';
        }

        // --- AUTO-CATEGORIZATION FOR SAVINGS/INVESTMENT ACCOUNTS ---
        let finalCategory = rawCat;
        let finalType: TransactionType = normalizedType;
        let finalCategoryId: string | undefined = undefined;

        // Check if payment method is savings or investment
        const pmName = selectedPaymentMethod && selectedPaymentMethod !== "excel_column"
          ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name?.toLowerCase()
          : row.paymentMethod?.toLowerCase();

        const pmDetails = currentPaymentMethods?.find(pm =>
          pm.name.toLowerCase() === pmName || pm.id === selectedPaymentMethod
        );

        if (pmDetails && (pmDetails.type === 'savings' || pmDetails.type === 'investment')) {
          // For savings/investment accounts, treat deposits/withdrawals as transfers
          if (normalizedType === 'income') {
            finalType = 'transfer_in';
            finalCategory = 'Transferencia entre Cuentas';
            finalCategoryId = catMap.get('transferencia entre cuentas') || undefined;
          } else if (normalizedType === 'expense') {
            finalType = 'transfer_out';
            finalCategory = 'Transferencia entre Cuentas';
            finalCategoryId = catMap.get('transferencia entre cuentas') || undefined;
          }
        }

        // Check for interest/yield descriptions
        const descriptionLower = row.description.toLowerCase();
        if (descriptionLower.includes('interés') || descriptionLower.includes('intereses') || descriptionLower.includes('rendimiento')) {
          finalType = 'income';
          finalCategory = 'Rendimientos';
          finalCategoryId = catMap.get('rendimientos') || undefined;
        }

        // --- CATEGORY RESOLUTION & DYNAMIC CREATION ---
        if (!finalCategoryId) {
          let categoryId = catMap.get(finalCategory.toLowerCase());
          if (!categoryId) {
            // Create new category
            const colorToUse = MASTER_PALETTE[catMap.size % MASTER_PALETTE.length];
            const catType = finalType;

            const { data: newCat, error: catErr } = await supabase
              .from('categories')
              .insert({
                user_id: user.id,
                name: finalCategory,
                type: (catType === 'transfer_in' || catType === 'transfer_out') ? 'other' : catType,
                color: colorToUse
              })
              .select()
              .single();

            if (catErr) {
              errors.push(`Fila ${i + 1}: Error creando categoría "${finalCategory}"`);
              continue;
            }
            categoryId = newCat.id;
            catMap.set(finalCategory.toLowerCase(), categoryId);
          }
          finalCategoryId = categoryId || undefined;
        }

        // --- PAYMENT METHOD RESOLUTION & DYNAMIC CREATION ---
        let pmId: string | null = null;
        if (selectedPaymentMethod && selectedPaymentMethod !== "excel_column") {
          pmId = selectedPaymentMethod;
        } else if (row.paymentMethod) {
          const rawPM = row.paymentMethod.trim();
          const rawPMLower = rawPM.toLowerCase();
          pmId = pmMap.get(rawPMLower) || null;

          if (!pmId) {
            // Create new payment method
            const { data: newPM, error: pmErr } = await supabase
              .from('payment_methods')
              .insert({
                user_id: user.id,
                name: rawPM,
                type: 'cash',
                balance: 0
              })
              .select()
              .single();

            if (pmErr) {
              errors.push(`Fila ${i + 1}: Error creando método de pago "${rawPM}"`);
              continue;
            }
            pmId = newPM.id;
            pmMap.set(rawPMLower, pmId);
          }
        }

        transactionsToImport.push({
          type: finalType as TransactionType,
          category: finalCategory,
          category_id: finalCategoryId,
          amount: row.amount,
          description: row.description,
          date: row.date,
          payment_method_id: pmId,
        });
      }

      if (errors.length > 0) {
        toast({
          title: "Advertencias en categorías",
          description: `Se encontraron ${errors.length} problemas que podrían afectar la importación.`,
          variant: "destructive"
        });
      }

      if (transactionsToImport.length === 0) {
        setIsImporting(false);
        localStorage.removeItem(importKey);
        return { count: 0 };
      }

      // En modo onboarding: pasar transacciones a onImport sin insertar en BD
      if (onboarding) {
        const result = await onImport(transactionsToImport);
        setParsedRows([]);
        setFileName('');
        setOpen(false);
        setIsImporting(false);
        localStorage.removeItem(importKey);

        trackEvent('excel_import_completed', {
          count: transactionsToImport.length,
          onboarding: true,
          result: 'success'
        });

        return result;
      }

      // Validación aleatoria del 10%
      const sampleSize = Math.max(1, Math.ceil(transactionsToImport.length * 0.1));
      const randomIndices = new Set<number>();

      while (randomIndices.size < sampleSize) {
        randomIndices.add(Math.floor(Math.random() * transactionsToImport.length));
      }

      const validationResults = {
        total: sampleSize,
        passed: 0,
        failed: 0,
        issues: [] as string[]
      };

      randomIndices.forEach(index => {
        const tx = transactionsToImport[index];

        // Validar campos críticos
        const issues = [];

        if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) {
          issues.push(`Fila ${index + 2}: Fecha inválida`);
        }

        if (!tx.description || tx.description.length < 2) {
          issues.push(`Fila ${index + 2}: Descripción muy corta`);
        }

        if (tx.amount <= 0 || tx.amount > 9999999999.99) {
          issues.push(`Fila ${index + 2}: Monto fuera de rango`);
        }

        if (!tx.category) {
          issues.push(`Fila ${index + 2}: Sin categoría`);
        }

        if (issues.length > 0) {
          validationResults.failed++;
          validationResults.issues.push(...issues);
        } else {
          validationResults.passed++;
        }
      });

      // Mostrar resultados de validación
      if (validationResults.failed > 0) {
        toast({
          title: `⚠️ Validación del 10% (${sampleSize} registros)`,
          description: `Pasaron: ${validationResults.passed}, Fallaron: ${validationResults.failed}\n${validationResults.issues.slice(0, 3).join('\n')}${validationResults.issues.length > 3 ? '\n...' : ''}`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: `✅ Validación del 10% exitosa`,
          description: `Se validaron ${sampleSize} registros aleatoriamente sin errores.`,
          duration: 5000,
        });
      }


      const batchSize = 100;
      let successCount = 0;
      let failCount = 0;
      const failedRows: { row: number; error: string }[] = [];

      for (let batch = 0; batch < transactionsToImport.length; batch += batchSize) {
        const batchTransactions = transactionsToImport.slice(batch, batch + batchSize).map((t, idx) => {
          // Truncar montos excesivos para permitir inserción
          const MAX_AMOUNT = 9999999999.99;
          const truncatedAmount = Math.min(t.amount, MAX_AMOUNT);
          const needsReview = t.amount > MAX_AMOUNT;

          return {
            user_id: user.id,
            type: (t.type === 'transfer_out' || t.type === 'transfer_in') ? 'transfer' : t.type,
            category: needsReview ? 'Por Clasificar' : t.category,
            category_id: needsReview ? null : t.category_id,
            amount: truncatedAmount,
            description: t.description,
            date: t.date,
            payment_method_id: needsReview ? null : t.payment_method_id,
            _originalIndex: batch + idx,
          };
        });

        try {
          const { error: insError, data } = await supabase
            .from('transactions')
            .insert(batchTransactions.map(({ _originalIndex, ...rest }) => rest))
            .select();

          if (insError) {
            let errorMsg = insError.message || 'Error desconocido';
            if (insError.code === '22003') {
              errorMsg = 'Error de formato numérico';
            }

            batchTransactions.forEach(t => {
              failedRows.push({
                row: (t._originalIndex ?? 0) + 2,
                error: errorMsg
              });
            });
            failCount += batchTransactions.length;
          } else {
            successCount += (data?.length || 0);
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
          batchTransactions.forEach(t => {
            failedRows.push({
              row: (t._originalIndex ?? 0) + 2,
              error: errorMsg
            });
          });
          failCount += batchTransactions.length;
        }

        const processed = Math.min(batch + batchSize, transactionsToImport.length);
        setProgress(Math.round((processed / transactionsToImport.length) * 100));

        localStorage.setItem(importKey, JSON.stringify({
          startTime: Date.now(),
          validRows: transactionsToImport.length,
          completed: processed,
          state: 'in_progress'
        }));
      }

      // Track completing the import
      trackEvent('excel_import_completed', {
        count: successCount,
        failed: failCount,
        result: failCount === 0 ? 'success' : 'failure'
      });

      if (failCount > 0) {
        const errorSummary = failedRows
          .slice(0, 5)
          .map(f => `• Fila ${f.row}: ${f.error}`)
          .join('\n');

        const moreErrors = failedRows.length > 5 ? `\n• ...y ${failedRows.length - 5} filas más con errores` : '';

        toast({
          title: `⚠️ Importación con errores`,
          description: `Se importaron ${successCount} de ${successCount + failCount} transacciones.\n\nErrores encontrados:\n${errorSummary}${moreErrors}\n\nRevisa el archivo Excel y vuelve a intentar.`,
          variant: 'destructive',
          duration: 15000,
        });
      } else {
        toast({
          title: '✅ Importación exitosa',
          description: `Se importaron ${successCount} transacciones correctamente.`
        });
      }

      setParsedRows([]);
      setFileName('');
      setOpen(false);
      localStorage.removeItem(importKey);

      return { count: successCount };

    } catch (err) {
      toast({
        title: "Error crítico",
        description: "Ocurrió un error inesperado durante la importación.",
        variant: "destructive"
      });
      localStorage.removeItem(importKey);
      return { count: 0, error: err };
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {showTriggerButton && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="gap-2 min-w-[120px] sm:min-w-[140px] text-[15px] py-2 flex items-center justify-center"
            aria-label="Importar Excel"
            title="Importar Excel"
          >
            <span className="hidden sm:flex flex-row items-center gap-2">Importar Excel <Upload className="h-3 w-3" /></span>
            <span className="sm:hidden flex flex-row items-center gap-2">Importar Excel <Upload className="h-3 w-3" /></span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          // Prevenir cierre cuando se hace clic fuera o se cambia de aplicación
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Permitir cerrar con ESC
          // Si quieres que ESC tampoco cierre, descomenta la siguiente línea:
          // e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Importar desde Excel</DialogTitle>
          <DialogDescription>
            Carga un archivo Excel con tus transacciones. Las columnas esperadas son: Fecha | Descripción | Categoría | Valor | Método de pago (opcional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 mt-4">
          <div className="p-4 bg-accent-soft-bg/50 rounded-xl text-sm space-y-2 border border-accent-soft-border/30">
            <p className="font-semibold text-foreground/90">Formato esperado:</p>
            <p className="text-muted-foreground/80">
              Columnas: Fecha | Descripción | Categoría | Valor | Método de pago (opcional)
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              Ejemplo: 15/01/2026 | Supermercado | Comida | {getExampleAmountDisplay()} | Débito BBVA
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Archivo Excel</Label>
            <div
              className={cn(
                "border-2 border-dashed border-border/60 rounded-xl p-4 sm:p-8 text-center transition-all duration-300 relative group",
                !isImporting && "cursor-pointer hover:border-primary/40 hover:bg-accent-soft-bg/20",
                isImporting && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !fileName && !isImporting && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="hidden"
              />
              {fileName ? (
                <div className="flex flex-col items-center justify-center gap-3 py-2">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold block">{fileName}</span>
                    <span className="text-xs text-muted-foreground">Archivo listo para procesar</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 absolute top-2 right-2 rounded-full hover:bg-destructive/10 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileName('');
                      setParsedRows([]);
                      setShowMappingStep(false);
                      setWorkbookData(null);
                      setAvailableSheets([]);
                      setSelectedSheet('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Upload className="h-6 sm:h-8 w-6 sm:w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Haz clic o arrastra un archivo</p>
                    <p className="text-xs text-muted-foreground underline decoration-dotted underline-offset-4">
                      Soporta .xlsx, .xls o .csv
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {availableSheets.length > 1 && !showMappingStep && parsedRows.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="font-medium text-sm">
                Seleccionar hoja
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  ({availableSheets.length} hojas disponibles)
                </span>
              </Label>
              <Select value={selectedSheet} onValueChange={handleSheetChange}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Selecciona una hoja" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheetName) => (
                    <SelectItem key={sheetName} value={sheetName}>
                      {sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <span className="italic">💡 Se seleccionó automáticamente la hoja con más datos relevantes</span>
              </p>
            </div>
          )}

          {showMappingStep && (
            <div className="space-y-4 p-5 border border-border/50 rounded-xl bg-card/50 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="space-y-1 flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold text-sm">Paso 1: Configura el mapeo de columnas</h3>
                  <p className="text-xs text-muted-foreground">
                    Asigna cada columna de tu archivo a los campos del sistema
                  </p>
                </div>
                {availableSheets.length > 1 && (
                  <Select value={selectedSheet} onValueChange={(sheetName) => {
                    setSelectedSheet(sheetName);
                    if (workbookData) processSheet(workbookData, sheetName);
                  }}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Cambiar hoja" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSheets.map((sheetName) => (
                        <SelectItem key={sheetName} value={sheetName} className="text-xs">
                          {sheetName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="hasHeader"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="rounded border-border/50 text-primary focus:ring-primary/30 h-4 w-4"
                />
                <Label htmlFor="hasHeader" className="text-sm cursor-pointer font-medium text-foreground/80">
                  La primera fila contiene encabezados
                </Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.date?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, date: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} <span className="text-[10px] opacity-60 ml-1">({col.samples[0]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.description?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, description: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} <span className="text-[10px] opacity-60 ml-1">({col.samples[0]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                    Monto <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.amount?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, amount: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} <span className="text-[10px] opacity-60 ml-1">({col.samples[0]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Categoría</Label>
                  <Select
                    value={columnMapping.category?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, category: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No mapear</SelectItem>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} <span className="text-[10px] opacity-60 ml-1">({col.samples[0]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Método de pago</Label>
                  <Select
                    value={columnMapping.paymentMethod?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, paymentMethod: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-lg">
                      <SelectValue placeholder="Selecciona columna de método de pago..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No mapear (usar predeterminado)</SelectItem>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} <span className="text-[10px] opacity-60 ml-1">({col.samples[0]})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleConfirmMapping} className="w-full h-11 shadow-sm font-semibold rounded-xl mt-2 transition-all active:scale-[0.98]">
                Continuar con este mapeo
              </Button>
            </div>
          )}

          {parsedRows.length > 0 && !showMappingStep && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowMappingStep(true);
                    setParsedRows([]);
                  }}
                  className="text-primary h-8 px-2 hover:bg-primary/5 text-xs font-medium"
                >
                  ⚙️ Cambiar mapeo de columnas
                </Button>

                <div className="flex items-center gap-3 text-xs font-medium">
                  <div className="flex items-center gap-1.5 text-income bg-income/10 px-2 py-1 rounded-full">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {validCount} listos
                  </div>
                  {invalidCount > 0 && (
                    <div className="flex items-center gap-1.5 text-expense bg-expense/10 px-2 py-1 rounded-full">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {invalidCount} errores
                    </div>
                  )}
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="rounded-xl bg-orange-50/50 border border-orange-200/50 p-3 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-orange-900 text-xs">Advertencia de validación</p>
                    <p className="text-[11px] text-orange-800/80 leading-relaxed">
                      Se detectaron inconsistencias. Los montos excesivos se marcaron para revisión manual tras la importación.
                    </p>
                  </div>
                </div>
              )}

              <div className="max-h-56 overflow-hidden border border-border/40 rounded-xl bg-muted/5">
                <div className="overflow-y-auto max-h-56">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm">
                      <tr className="border-b border-border/30">
                        <th className="p-2.5 text-left font-semibold text-muted-foreground/80">Fecha</th>
                        <th className="p-2.5 text-left font-semibold text-muted-foreground/80">Descripción</th>
                        <th className="p-2.5 text-left font-semibold text-muted-foreground/80">Categoría</th>
                        <th className="p-2.5 text-right font-semibold text-muted-foreground/80">Monto</th>
                        <th className="p-2.5 text-center font-semibold text-muted-foreground/80">Cdo.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {parsedRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className={cn(
                          "hover:bg-accent-soft-bg/10 transition-colors",
                          !row.isValid && 'bg-expense/5'
                        )}>
                          <td className="p-2.5 text-muted-foreground/90 font-medium">{row.date || '-'}</td>
                          <td className="p-2.5 truncate max-w-[120px] font-medium" title={row.description}>{row.description || '-'}</td>
                          <td className="p-2.5 text-muted-foreground/70">{row.category || '-'}</td>
                          <td className="p-2.5 text-right font-bold text-foreground/80">
                            {getCurrencySymbol()} {row.amount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                          </td>
                          <td className="p-2.5 text-center">
                            {row.isValid ? (
                              <div className="flex justify-center">
                                <CheckCircle className="h-3.5 w-3.5 text-income shadow-sm" />
                              </div>
                            ) : (
                              <div className="flex justify-center" title={row.error}>
                                <AlertCircle className="h-3.5 w-3.5 text-expense" />
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 50 && (
                    <p className="p-2 text-[10px] text-center text-muted-foreground italic border-t border-border/10">
                      Mostrando las primeras 50 de {parsedRows.length} filas...
                    </p>
                  )}
                </div>
              </div>

              {isImporting ? (
                <div className="space-y-3 py-2">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-primary/80 px-1">
                    <span>Procesando transacciones...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-primary/10 rounded-full overflow-hidden border border-primary/5">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                    Por favor no cierres esta ventana hasta terminar la carga
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => handleImport()}
                  className="w-full h-11 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 rounded-xl transition-all active:scale-[0.99] group overflow-hidden"
                  disabled={validCount === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative z-10 flex items-center gap-2">
                    Completar Importación {validCount > 0 && `(${validCount} filas)`}
                  </span>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}






