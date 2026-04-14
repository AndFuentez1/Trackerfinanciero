import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { queryKeys } from '@/core/api/queryKeys';
import { MASTER_PALETTE } from '@/features/finance/hooks/useFinanceDataLogic';
import type { Transaction, TransactionType, PaymentMethod } from '@/features/finance/types/financeTypes';
import { parse, isValid, format as formatDateFns } from 'date-fns';
import { mapTransactionRow, TransactionRow } from '@/features/finance/utils/transactionMappers';
import {
  ParsedRow,
  ColumnMapping,
  ColumnPreview,
  findBestSheet,
  autoDetectMapping,
  parseDate,
  parseAmountSample
} from '../utils/excelImportUtils';

interface UseExcelImportProps {
  paymentMethods: PaymentMethod[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error?: unknown; count: number }>;
  onboarding?: boolean;
  externalOpen?: boolean;
  externalOnOpenChange?: (open: boolean) => void;
  decimalPlaces: number;
}

export function useExcelImport({
  paymentMethods,
  onImport,
  onboarding = false,
  externalOpen,
  externalOnOpenChange,
  decimalPlaces
}: UseExcelImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
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

  const processSheet = (workbook: XLSX.WorkBook, sheetName: string, mapping?: ColumnMapping) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (jsonData.length === 0) {
      setParsedRows([]);
      return;
    }

    if (!mapping) {
      const firstRow = jsonData[0] as unknown[];
      const previews: ColumnPreview[] = firstRow.map((header, index) => ({
        index,
        header: String(header || `Columna ${index + 1}`),
        samples: jsonData.slice(1, 4).map(row => String((row as unknown[])[index] || '')).filter(s => s),
      }));

      setColumnPreviews(previews);
      const detectedMapping = autoDetectMapping(firstRow);
      setColumnMapping(detectedMapping);
      setShowMappingStep(true);
      return;
    }

    const startRow = hasHeader ? 1 : 0;
    const rows = jsonData.slice(startRow).filter(row => Array.isArray(row) && row.length > 0) as unknown[][];
    const MAX_AMOUNT = 9999999999.99;

    const parsed: ParsedRow[] = rows.map((row: unknown[]) => {
      const rawDate = mapping.date !== null ? row[mapping.date] : undefined;
      const date = parseDate((typeof rawDate === 'string' || typeof rawDate === 'number') ? rawDate : '');
      const rawDescription = mapping.description !== null ? String(row[mapping.description] || '').trim() : '';
      const description = rawDescription.replace(/^(descripci[óo]n|description|concepto|detalle|memo):\s*/i, '');
      const category = mapping.category !== null ? String(row[mapping.category] || '').trim() : '';
      const rawValue = mapping.amount !== null ? String(row[mapping.amount] || '0').trim() : '0';

      const cleanValue = (() => {
        const val = rawValue.replace(/\$/g, '').trim();
        const lastCommaIdx = val.lastIndexOf(',');
        const lastPeriodIdx = val.lastIndexOf('.');

        if (lastCommaIdx === -1 && lastPeriodIdx === -1) {
          return val;
        }
        if (lastCommaIdx > lastPeriodIdx) {
          return val.replace(/\./g, '').replace(/,/, '.');
        }
        if (lastPeriodIdx > lastCommaIdx) {
          return val.replace(/,/g, '');
        }

        if (lastCommaIdx !== -1) {
          const beforeComma = val.substring(0, lastCommaIdx).replace(/\./g, '');
          const afterComma = val.substring(lastCommaIdx + 1);
          return afterComma.length > 2 ? beforeComma + afterComma : beforeComma + '.' + afterComma;
        } else {
          const beforePeriod = val.substring(0, lastPeriodIdx).replace(/,/g, '');
          const afterPeriod = val.substring(lastPeriodIdx + 1);
          return afterPeriod.length <= 3 ? beforePeriod + '.' + afterPeriod : beforePeriod + afterPeriod;
        }
      })();

      const amount = parseFloat(cleanValue);
      const absAmount = Math.abs(amount);
      const paymentMethod = mapping.paymentMethod !== null && row[mapping.paymentMethod]
        ? String(row[mapping.paymentMethod]).trim()
        : undefined;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!date) {
        errors.push('Fecha inválida');
      }
      if (!description) {
        errors.push('Sin descripción');
      }
      if (isNaN(amount) || amount === 0) {
        errors.push('Monto inválido');
      }

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

      const bestSheet = findBestSheet(workbook);
      setSelectedSheet(bestSheet);

      processSheet(workbook, bestSheet);

      if (workbook.SheetNames.length > 1) {
        toast({
          title: "Hoja seleccionada",
          description: `Se seleccionó automáticamente "${bestSheet}". Puedes cambiarla si lo deseas.`,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setShowMappingStep(false);
    setParsedRows([]);
    if (workbookData) {
      processSheet(workbookData, sheetName);
    }
  };

  const handleConfirmMapping = () => {
    if (!workbookData || !selectedSheet) return;

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

  const getAvailableColumns = (excludeIndex?: number | null) => {
    return columnPreviews.filter(col => {
      const isAssigned = Object.entries(columnMapping).some(
        ([key, value]) => value === col.index && value !== excludeIndex
      );
      return !isAssigned;
    });
  };

  const getColumnLabel = (col: ColumnPreview, type?: 'date' | 'amount') => {
    const sample = col.samples[0];
    if (sample) {
      if (type === 'date') {
        const numeric = Number(sample);
        const parsed = parseDate(!Number.isNaN(numeric) ? numeric : sample);
        if (parsed) {
          const d = parse(parsed, 'yyyy-MM-dd', new Date());
          return isValid(d) ? formatDateFns(d, 'dd/MM/yyyy') : parsed;
        }
      }

      if (type === 'amount') {
        const amount = parseAmountSample(sample);
        if (amount !== null) {
          return amount.toLocaleString(undefined, {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          });
        }
      }

      return sample;
    }

    return col.header || `Columna ${col.index + 1}`;
  };

  const handleImport = async () => {
    if (!user) {
      alert("No autenticado");
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);

    const importKey = `import_${user.id}_${Date.now()}`;
    localStorage.setItem(importKey, JSON.stringify({
      startTime: Date.now(),
      validRows: validRows.length,
      completed: 0,
      state: 'in_progress'
    }));

    try {
      const [{ data: currentCategories }, { data: currentPaymentMethods }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('payment_methods').select('*').eq('user_id', user.id)
      ]);

      const catMap = new Map<string, string>((currentCategories || []).map(c => [c.name.toLowerCase(), String(c.id)]));
      const pmMap = new Map<string, string>((currentPaymentMethods || []).map(pm => [pm.name.toLowerCase(), String(pm.id)]));

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

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const rawCat = row.category.trim();
        const rawCatLower = rawCat.toLowerCase();

        let normalizedType: TransactionType = 'expense';

        if (['ingreso', 'salario', 'venta', 'honorarios', 'nómina', 'renta'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'income';
        } else if (['ahorro', 'cdt', 'inversión', 'inversion'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'saving';
        } else if (['prestamo', 'préstamo', 'deuda'].some(k => rawCatLower.includes(k))) {
          normalizedType = 'loan';
        }

        let finalCategory = rawCat;
        let finalType: TransactionType = normalizedType;
        let finalCategoryId: string | undefined = undefined;

        const pmName = selectedPaymentMethod && selectedPaymentMethod !== "excel_column"
          ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.name?.toLowerCase()
          : row.paymentMethod?.toLowerCase();

        const pmDetails = currentPaymentMethods?.find(pm =>
          pm.name.toLowerCase() === pmName || pm.id === selectedPaymentMethod
        );

        if (pmDetails && (pmDetails.type === 'savings' || pmDetails.type === 'investment')) {
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

        const descriptionLower = row.description.toLowerCase();
        if (descriptionLower.includes('interés') || descriptionLower.includes('intereses') || descriptionLower.includes('rendimiento')) {
          finalType = 'income';
          finalCategory = 'Rendimientos';
          finalCategoryId = catMap.get('rendimientos') || undefined;
        }

        if (!finalCategoryId) {
          let categoryId = catMap.get(finalCategory.toLowerCase());
          if (!categoryId) {
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

        let pmId: string | null = null;
        if (selectedPaymentMethod && selectedPaymentMethod !== "excel_column") {
          pmId = selectedPaymentMethod;
        } else if (row.paymentMethod) {
          const rawPM = row.paymentMethod.trim();
          const rawPMLower = rawPM.toLowerCase();
          pmId = pmMap.get(rawPMLower) || null;

          if (!pmId) {
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

      const validationResults = {
        total: transactionsToImport.length,
        passed: 0,
        failed: 0,
        issues: [] as string[]
      };

      transactionsToImport.forEach((tx, index) => {
        const issues = [];

        if (!tx.date || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) issues.push(`Fila ${index + 2}: Fecha inválida`);
        if (!tx.description || tx.description.length < 2) issues.push(`Fila ${index + 2}: Descripción muy corta`);
        if (tx.amount <= 0 || isNaN(tx.amount)) issues.push(`Fila ${index + 2}: Monto inválido o en cero`);
        else if (tx.amount > 9999999999.99) issues.push(`Fila ${index + 2}: Monto excesivo (límite superado)`);
        if (!tx.category) issues.push(`Fila ${index + 2}: Sin categoría`);

        if (issues.length > 0) {
          validationResults.failed++;
          validationResults.issues.push(...issues);
        } else {
          validationResults.passed++;
        }
      });

      if (validationResults.failed > 0) {
        toast({
          title: `⚠️ Revisión de formato con problemas`,
          description: `Se detectaron inconsistencias en algunas filas:\n${validationResults.issues.slice(0, 3).join('\n')}${validationResults.issues.length > 3 ? '\n...' : ''}`,
          variant: "destructive",
          duration: 10000,
        });
        setIsImporting(false);
        localStorage.removeItem(importKey);
        return { count: 0 };
      }

      const batchSize = 100;
      let successCount = 0;
      let failCount = 0;
      const failedRows: { row: number; error: string }[] = [];
      const insertedRows: TransactionRow[] = [];

      for (let batch = 0; batch < transactionsToImport.length; batch += batchSize) {
        const batchTransactions = transactionsToImport.slice(batch, batch + batchSize).map((t, idx) => {
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
            if (insError.code === '22003') errorMsg = 'Error de formato numérico';

            batchTransactions.forEach(t => {
              failedRows.push({ row: (t._originalIndex ?? 0) + 2, error: errorMsg });
            });
            failCount += batchTransactions.length;
          } else {
            successCount += (data?.length || 0);
            if (data && data.length > 0) {
              insertedRows.push(...data as TransactionRow[]);
            }
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Error desconocido';
          batchTransactions.forEach(t => {
            failedRows.push({ row: (t._originalIndex ?? 0) + 2, error: errorMsg });
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

      trackEvent('excel_import_completed', {
        count: successCount,
        failed: failCount,
        result: failCount === 0 ? 'success' : 'failure'
      });

      if (failCount > 0) {
        const errorSummary = failedRows.slice(0, 5).map(f => `• Fila ${f.row}: ${f.error}`).join('\n');
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

      // Actualización inmediata del Dashboard: cache optimista para allTransactions
      // (evita esperar al refetch completo, especialmente con staleTime alto).
      if (user?.id && insertedRows.length > 0) {
        const mappedInserted = insertedRows.map(mapTransactionRow);
        queryClient.setQueryData(queryKeys.finance.allTransactions(user.id), (prev: any) => {
          const prevList = Array.isArray(prev) ? prev : [];
          const merged = [...mappedInserted, ...prevList];
          const seen = new Set<string>();
          return merged.filter((t) => {
            const id = String(t?.id ?? '');
            if (!id) return false;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        });
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });

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

  return {
    open,
    setOpen,
    parsedRows,
    setParsedRows,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isImporting,
    progress,
    fileName,
    availableSheets,
    selectedSheet,
    workbookData,
    columnMapping,
    setColumnMapping,
    columnPreviews,
    hasHeader,
    setHasHeader,
    showMappingStep,
    fileInputRef,
    handleFileSelect,
    handleSheetChange,
    handleConfirmMapping,
    getAvailableColumns,
    getColumnLabel,
    handleImport,
    validCount,
    invalidCount
  };
}
