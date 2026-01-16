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

interface ImportExcelDialogProps {
  paymentMethods: PaymentMethod[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error: any; count: number }>;
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

const parseDate = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  const date = new Date(value as any);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  const parts = String(value).split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const y = year.length === 2 ? `20${year}` : year;
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
};

export function ImportExcelDialog({ paymentMethods, onImport }: ImportExcelDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
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
        const date = parseDate(row[0]);
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
          // For savings/investment accounts, treat deposits/withdrawals as transfers
          if (normalizedType === 'income' || normalizedType === 'expense') {
            finalType = 'transfer';
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
        return;
      }

      console.log(`Intentando importar ${transactionsToImport.length} transacciones una a una...`);
      let successCount = 0;
      let failCount = 0;
      const total = transactionsToImport.length;

      for (let i = 0; i < total; i++) {
        const t = transactionsToImport[i];
        try {
          const { error: insError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              type: t.type === 'transfer_out' || t.type === 'transfer_in' ? 'transfer' : t.type,
              category: t.category,
              category_id: t.category_id,
              amount: t.amount,
              description: t.description,
              date: t.date,
              payment_method_id: t.payment_method_id,
            });

          if (insError) {
            console.error("Error al insertar fila:", insError, t);
            failCount++;
          } else {
            successCount++;
          }
        } catch (e) {
          console.error("Excepción al insertar fila:", e, t);
          failCount++;
        }
        // Update progress
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      if (failCount > 0) {
        alert(`Importación finalizada con problemas. Éxito: ${successCount}, Fallo: ${failCount}. Revisa la consola para más detalles.`);
      } else {
        toast({ title: 'Importación completada', description: `Se importaron ${successCount} transacciones.` });
        setParsedRows([]);
        setFileName('');
        setOpen(false);
      }

      // We still call onImport with empty array or just to trigger a refresh in the parent if possible
      // Actually, onImport in History.tsx/Index.tsx calls fetchData, which we need.
      await onImport([]);

    } catch (err) {
      console.error("Excepción durante la importación:", err);
      alert("Ocurrió un error inesperado durante la importación.");
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar desde Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
            <Label>Archivo Excel</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
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
                  <p className="text-xs text-center text-muted-foreground">Procesando... {progress}%</p>
                </div>
              ) : (
                <Button
                  onClick={handleImport}
                  className="w-full"
                  disabled={validCount === 0}
                >
                  Importar {validCount} transacciones
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
