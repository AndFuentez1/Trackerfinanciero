import type { Transaction, PaymentMethod } from '@/features/finance/types/financeTypes';
import { useFinance } from '@/features/finance/context/FinanceContext';
import { CURRENCIES } from '@/features/finance/constants/currencyConstants';
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

interface ImportExcelDialogProps {
  paymentMethods: PaymentMethod[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error?: unknown; count: number }>;
  onImportBackground?: (transactions: Omit<Transaction, 'id'>[]) => Promise<{ error?: unknown; count: number }>; // Para correr en segundo plano
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTriggerButton?: boolean;
  onboarding?: boolean;
}

import { useExcelImport } from '../hooks/useExcelImport';

export function ImportExcelDialog({
  paymentMethods,
  onImport,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  showTriggerButton = true,
  onboarding = false
}: ImportExcelDialogProps) {
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

  const {
    open,
    setOpen,
    parsedRows,
    setParsedRows,
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
    getColumnLabel,
    handleImport,
    validCount,
    invalidCount
  } = useExcelImport({
    paymentMethods,
    onImport,
    onboarding,
    externalOpen,
    externalOnOpenChange,
    decimalPlaces
  });

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      {showTriggerButton && (
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="gap-2 flex items-center justify-center hover:bg-primary/60 hover:text-primary-foreground hover:border-primary/60 md:text-[15px]"
            aria-label="Importar Excel"
            title="Importar Excel"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Importar Excel</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:max-w-3xl md:max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col z-[100]"
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

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="mt-4 pb-2 flex min-h-0 flex-col gap-3 sm:gap-4">
            <div className="p-4 bg-accent-soft-bg/50 rounded-xl text-sm space-y-2 border border-accent-soft-border/30">
              <p className="font-semibold text-foreground/90">Formato esperado:</p>
              <p className="text-muted-foreground/80 font-medium">
                Formato de columnas esperado:
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground/80 leading-relaxed font-medium">
                15/01/2026 | Supermercado | Comida | {getExampleAmountDisplay()} | Débito BBVA
              </p>
            </div>

            <div className="space-y-2 flex-1 min-h-0 flex flex-col">
              <Label className="text-sm font-medium">Archivo Excel</Label>
              <div
                className={cn(
                  "border-2 border-dashed border-border/60 rounded-xl p-6 sm:p-10 text-center transition-all duration-300 relative group flex-1 flex flex-col items-center justify-center",
                  parsedRows.length > 0 || showMappingStep
                    ? "min-h-[10vh] sm:min-h-[10vh]"
                    : "min-h-[38vh] sm:min-h-[42vh]",
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
                      if (workbookData) { processSheet(workbookData, sheetName); }
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
                            {getColumnLabel(col, 'date')}
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
                            {getColumnLabel(col)}
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
                            {getColumnLabel(col, 'amount')}
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
                            {getColumnLabel(col)}
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
                            {getColumnLabel(col)}
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

                <div className="h-[24rem] flex flex-col gap-3">
                  <div className="border border-border/40 rounded-xl bg-muted/5 overflow-hidden flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                      <table className="w-full text-xs table-fixed">
                        <thead className="bg-muted sticky top-0">
                          <tr className="border-b border-border/30">
                            <th className="w-24 p-2.5 text-left font-semibold text-muted-foreground/80">Fecha</th>
                            <th className="p-2.5 text-left font-semibold text-muted-foreground/80">Descripción</th>
                            <th className="w-28 p-2.5 text-left font-semibold text-muted-foreground/80">Categoría</th>
                            <th className="w-24 p-2.5 text-right font-semibold text-muted-foreground/80">Monto</th>
                            <th className="w-12 p-2.5 text-center font-semibold text-muted-foreground/80">Cdo.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {parsedRows.slice(0, 50).map((row, i) => (
                            <tr key={i} className={cn(
                              "hover:bg-accent-soft-bg/10 transition-colors",
                              !row.isValid && 'bg-expense/5'
                            )}>
                              <td className="w-24 p-2.5 text-muted-foreground/90 font-medium">
                                {row.date ? (() => {
                                  const d = parse(row.date, 'yyyy-MM-dd', new Date());
                                  return isValid(d) ? formatDateFns(d, 'dd/MM/yyyy') : row.date;
                                })() : '-'}
                              </td>
                              <td className="p-2.5 truncate font-medium" title={row.description}>{row.description || '-'}</td>
                              <td className="w-28 p-2.5 text-muted-foreground/70">{row.category || '-'}</td>
                              <td className="w-24 p-2.5 text-right font-bold text-foreground/80">
                                {getCurrencySymbol()} {row.amount.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}
                              </td>
                              <td className="w-12 p-2.5 text-center">
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
                    {isImporting && (
                      <div className="space-y-3 py-2 px-3 border-t border-border/20">
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
                        <p className="text-[10px] text-center text-muted-foreground">
                          Por favor no cierres esta ventana hasta terminar la carga
                        </p>
                      </div>
                    )}
                  </div>

                  {!isImporting && (
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
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}






