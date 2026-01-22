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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      const rows = jsonData.slice(1).filter(row => Array.isArray(row) && row.length > 0) as unknown[][];

      const parsed: ParsedRow[] = rows.map((row: unknown[]) => {
        const rawDate = row[0] as string | number | undefined;
        const date = parseDate(rawDate as any);
        const description = String(row[1] || '').trim();
        const category = String(row[2] || '').trim();
        const rawValue = String(row[3] || '0').trim();

        const cleanValue = rawValue
          .replace(/\$/g, '')
          .replace(/\./g, '')
          .replace(/,/g, '.');

        const amount = parseFloat(cleanValue);
        const paymentMethod = row[4] ? String(row[4]).trim() : undefined;

        const errors: string[] = [];
        if (!date) errors.push('Fecha inválida');
        if (!description) errors.push('Sin descripción');
        if (isNaN(amount) || amount === 0) errors.push('Monto inválido');

        return {
          date: date || '',
          description,
          category,
          amount: isNaN(amount) ? 0 : Math.abs(amount),
          paymentMethod,
          isValid: errors.length === 0,
          error: errors.length > 0 ? errors.join(', ') : undefined,
        };
      });

      setParsedRows(parsed);
    };
    reader.readAsArrayBuffer(file);
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
              console.error('Error creating category:', catErr);
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
              console.error('Error creating payment method:', pmErr);
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
        console.log(`Procesadas ${transactionsToImport.length} transacciones en modo onboarding`);
        await onImport(transactionsToImport);
        setParsedRows([]);
        setFileName('');
        setOpen(false);
        setIsImporting(false);
        localStorage.removeItem(importKey);
        return;
      }

      // Batch insert con tracking de errores por fila
      console.log(`Importando ${transactionsToImport.length} transacciones en batch...`);
      const batchSize = 100;
      let successCount = 0;
      let failCount = 0;
      const failedRows: { row: number; error: string }[] = [];

      for (let batch = 0; batch < transactionsToImport.length; batch += batchSize) {
        const batchTransactions = transactionsToImport.slice(batch, batch + batchSize).map((t, idx) => ({
          user_id: user.id,
          type: t.type === 'transfer_out' || t.type === 'transfer_in' ? 'transfer' : t.type,
          category: t.category,
          category_id: t.category_id,
          amount: t.amount,
          description: t.description,
          date: t.date,
          payment_method_id: t.payment_method_id,
          _originalIndex: batch + idx, // Track original row index
        }));

        try {
          const { error: insError, data } = await supabase
            .from('transactions')
            .insert(batchTransactions.map(({ _originalIndex, ...rest }) => rest))
            .select();

          if (insError) {
            console.error("Error en batch insert:", insError);
            // Registrar todas las filas del batch como fallidas
            batchTransactions.forEach(t => {
              failedRows.push({
                row: t._originalIndex + 2, // +2 por header y base-1
                error: insError.message || 'Error desconocido'
              });
            });
            failCount += batchTransactions.length;
          } else {
            successCount += (data?.length || 0);
          }
        } catch (e) {
          console.error("Excepción en batch insert:", e);
          // Registrar todas las filas del batch como fallidas
          batchTransactions.forEach(t => {
            failedRows.push({
              row: t._originalIndex + 2,
              error: e instanceof Error ? e.message : 'Error desconocido'
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
          .slice(0, 10)
          .map(f => `Fila ${f.row}: ${f.error}`)
          .join('\n');
        
        const moreErrors = failedRows.length > 10 ? `\n...y ${failedRows.length - 10} errores más` : '';
        
        toast({
          title: 'Importación completada con errores',
          description: `✓ ${successCount} exitosos | ✗ ${failCount} fallidos\n\n${errorSummary}${moreErrors}`,
          variant: 'destructive',
          duration: 10000,
        });
        
        // Mantener el diálogo abierto para que el usuario vea los errores
        setParsedRows([]);
        setFileName('');
      } else {
        toast({ 
          title: 'Importación completada', 
          description: `Se importaron ${successCount} transacciones correctamente.` 
        });
        setParsedRows([]);
        setFileName('');
        setOpen(false);
      }

      // Limpiar localStorage
      localStorage.removeItem(importKey);

    } catch (err) {
      console.error("Excepción durante la importación:", err);
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
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
              className="border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
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

          {parsedRows.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Método de pago (para todas las filas)</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Usar columna Excel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel_column">Usar columna Excel</SelectItem>
                    {paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
