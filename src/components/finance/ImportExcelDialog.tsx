import { useState, useRef } from 'react';
import { Transaction, TransactionType, PaymentMethod, MASTER_PALETTE } from '@/hooks/useFinanceData';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parse, isValid, format as formatDateFns } from 'date-fns';

interface ImportExcelDialogProps {
  paymentMethods: PaymentMethod[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error: any; count: number }>;
  onImportBackground?: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error: any; count: number }>; // Para correr en segundo plano
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
      const date = parseDate(rawDate as any);
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

      const catMap = new Map((currentCategories || []).map(c => [c.name.toLowerCase(), c.id]));
      const pmMap = new Map((currentPaymentMethods || []).map(pm => [pm.name.toLowerCase(), pm.id]));

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
        let finalType = normalizedType;
        let finalCategoryId: string | undefined = undefined;

        // Check if payment method is savings or investment
        const pmName = selectedPaymentMethod && selectedPaymentMethod !== "excel_column" 
          ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name?.toLowerCase()
          : row.paymentMethod?.toLowerCase();

        const pmDetails = currentPaymentMethods?.find(pm => 
          pm.name.toLowerCase() === pmName || pm.id === selectedPaymentMethod
        );

        if (pmDetails && (pmDetails.type === 'savings' || pmDetails.type === 'investment')) {
          // For savings/investment accounts, treat deposits/withdrawals as transfers (keep type as income/expense)
          if (normalizedType === 'income' || normalizedType === 'expense') {
            finalCategory = 'Transferencia entre Cuentas';
            finalCategoryId = catMap.get('transferencia entre cuentas');
          }
        }

        // Check for interest/yield descriptions
        const descriptionLower = row.description.toLowerCase();
        if (descriptionLower.includes('interés') || descriptionLower.includes('intereses') || descriptionLower.includes('rendimiento')) {
          finalType = 'income';
          finalCategory = 'Rendimientos';
          finalCategoryId = catMap.get('rendimientos');
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
                type: catType as any,
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
          finalCategoryId = categoryId;
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
        alert(`Errores previos encontrados:\n${errors.join('\n')}`);
        // We continue with those that are valid
      }

      if (transactionsToImport.length === 0) {
        setIsImporting(false);
        localStorage.removeItem(importKey);
        return;
      }

      // En modo onboarding: pasar transacciones a onImport sin insertar en BD
      if (onboarding) {

        await onImport(transactionsToImport);
        setParsedRows([]);
        setFileName('');
        setOpen(false);
        setIsImporting(false);
        localStorage.removeItem(importKey);
        return;
      }

      // Batch insert con tracking de errores por fila

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
            type: t.type === 'transfer_out' || t.type === 'transfer_in' ? 'transfer' : t.type,
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

            
            // Determinar el mensaje de error específico
            let errorMsg = insError.message || 'Error desconocido';
            if (insError.code === '22003') {
              errorMsg = 'Error de formato numérico';
            }
            
            // Registrar todas las filas del batch como fallidas
            batchTransactions.forEach(t => {
              failedRows.push({
                row: t._originalIndex + 2, // +2 por header y base-1
                error: errorMsg
              });
            });
            failCount += batchTransactions.length;
          } else {
            successCount += (data?.length || 0);
          }
        } catch (e) {

          
          // Determinar el mensaje de error específico
          let errorMsg = e instanceof Error ? e.message : 'Error desconocido';
          
          // Registrar todas las filas del batch como fallidas
          batchTransactions.forEach(t => {
            failedRows.push({
              row: t._originalIndex + 2,
              error: errorMsg
            });
          });
          failCount += batchTransactions.length;
        }

        // Update progress
        const processed = Math.min(batch + batchSize, transactionsToImport.length);
        setProgress(Math.round((processed / transactionsToImport.length) * 100));
        
        // Actualizar localStorage
        localStorage.setItem(importKey, JSON.stringify({
          startTime: Date.now(),
          validRows: transactionsToImport.length,
          completed: processed,
          state: 'in_progress'
        }));
      }

      // Mostrar resultados con detalle de errores
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
      
      // Cerrar el diálogo siempre después de importar
      setParsedRows([]);
      setFileName('');
      setOpen(false);

      // Limpiar localStorage
      localStorage.removeItem(importKey);

    } catch (err) {

      alert("Ocurrió un error inesperado durante la importación.");
      localStorage.removeItem(importKey);
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
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label="Importar Excel"
            title="Importar Excel"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Importar Excel</span>
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
          <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
            <p className="font-medium">Formato esperado:</p>
            <p className="text-muted-foreground">
              Columnas: Fecha | Descripción | Categoría | Valor | Método de pago (opcional)
            </p>
            <p className="text-xs text-muted-foreground">
              Ejemplo: 15/01/2026 | Supermercado | Comida | 500 | Débito BBVA
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Archivo Excel</Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-primary/50 transition-colors relative"
              onClick={() => !fileName && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {fileName ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="text-sm">{fileName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-2 right-2 hover:bg-destructive/10"
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
                <div className="space-y-2">
                  <Upload className="h-6 sm:h-8 w-6 sm:w-8 mx-auto text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Haz clic o arrastra un archivo .xlsx, .xls o .csv
                  </p>
                </div>
              )}
            </div>
          </div>

          {availableSheets.length > 1 && !showMappingStep && parsedRows.length > 0 && (
            <div className="space-y-2">
              <Label>
                Seleccionar hoja
                <span className="text-xs text-muted-foreground ml-2">
                  ({availableSheets.length} hojas disponibles)
                </span>
              </Label>
              <Select value={selectedSheet} onValueChange={handleSheetChange}>
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground">
                💡 Se seleccionó automáticamente la hoja con más datos relevantes
              </p>
            </div>
          )}

          {showMappingStep && (
            <div className="space-y-4 p-4 border rounded-lg bg-card">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Paso 1: Configura el mapeo de columnas</h3>
                <p className="text-xs text-muted-foreground">
                  Asigna cada columna de tu archivo a los campos requeridos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasHeader"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="hasHeader" className="text-sm cursor-pointer">
                  La primera fila contiene encabezados
                </Label>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">
                    Fecha <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.date?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, date: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} - Ej: {col.samples[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Descripción <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.description?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, description: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} - Ej: {col.samples[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Monto <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={columnMapping.amount?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, amount: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} - Ej: {col.samples[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Categoría (opcional)</Label>
                  <Select
                    value={columnMapping.category?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, category: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} - Ej: {col.samples[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Método de pago (opcional)</Label>
                  <Select
                    value={columnMapping.paymentMethod?.toString() ?? 'none'}
                    onValueChange={(val) => setColumnMapping({ ...columnMapping, paymentMethod: val !== 'none' ? parseInt(val) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {columnPreviews.map((col) => (
                        <SelectItem key={col.index} value={col.index.toString()}>
                          {col.header} - Ej: {col.samples[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleConfirmMapping} className="w-full">
                Continuar con este mapeo
              </Button>
            </div>
          )}

          {parsedRows.length > 0 && !showMappingStep && (
            <>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowMappingStep(true);
                    setParsedRows([]);
                  }}
                >
                  ⚙️ Cambiar mapeo de columnas
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {validCount} válidos
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {invalidCount} con errores
                  </div>
                )}
              </div>

              {invalidCount > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                  <p className="font-medium text-amber-900 mb-1">⚠️ Advertencias detectadas</p>
                  <p className="text-xs text-muted-foreground">
                    Revisa la tabla abajo. Los montos excesivos se truncarán y se marcarán con estado de atención para filtrarlas en el historial.
                  </p>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-left">Categoría</th>
                      <th className="p-2 text-right">Monto</th>
                      <th className="p-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className={row.isValid ? '' : 'bg-destructive/10'}>
                        <td className="p-2">{row.date || '-'}</td>
                        <td className="p-2 truncate max-w-32">{row.description || '-'}</td>
                        <td className="p-2">{row.category || '-'}</td>
                        <td className="p-2 text-right">${row.amount.toLocaleString()}</td>
                        <td className="p-2 text-center">
                          {row.isValid ? (
                            <CheckCircle className="h-3 w-3 text-green-600 mx-auto" />
                          ) : (
                            <span className="text-destructive" title={row.error}>
                              <AlertCircle className="h-3 w-3 mx-auto" />
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isImporting ? (
                <div className="space-y-2">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Importando en background... {progress}%</p>
                </div>
              ) : (
                <Button
                  onClick={() => handleImport()}
                  className="w-full h-10"
                  disabled={validCount === 0}
                >
                  Importar {validCount > 0 && `(${validCount} filas)`}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
