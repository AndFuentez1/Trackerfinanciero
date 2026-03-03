import { useState } from 'react';
import { Upload, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { ImportExcelDialog } from '@/features/finance/transactions/components/ImportExcelDialog';
import type { PaymentMethod, Transaction } from '@/features/finance/hooks/useFinanceData';
import { cn } from '@/core/utils';

interface ThemeOption {
  label: string;
  hex: string;
}

interface ImportProgress {
  status: 'idle' | 'loading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  error?: string;
  recordsProcessed?: number;
}

interface OnboardingDecisionPanelProps {
  onStartFromScratch: () => Promise<void>;
  hasPendingImport: boolean;
  onConfirmImport: () => Promise<void>;
  pendingImportCount: number;
  importProgress: ImportProgress;
  onCancelImport: () => void;
  paymentMethods: PaymentMethod[];
  onImportComplete: (data: Omit<Transaction, 'id'>[]) => Promise<void> | void;
  showCompletionCard: boolean;
  baseColor?: string;
  themeOptions?: ThemeOption[];
  onSelectTheme?: (hex: string) => void;
}

export function OnboardingDecisionPanel({
  onStartFromScratch,
  hasPendingImport,
  onConfirmImport,
  pendingImportCount,
  importProgress,
  onCancelImport,
  paymentMethods,
  onImportComplete,
  showCompletionCard,
  baseColor = '#64748b',
  themeOptions = [],
  onSelectTheme,
}: OnboardingDecisionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(baseColor);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleStartFromScratch = async () => {
    setIsLoading(true);
    try {
      await onStartFromScratch();
    } finally {
      setIsLoading(false);
    }
  };

  // Show completion card when import is finished
  if (showCompletionCard) {
    return (
      <div className="fixed inset-0 lg:left-64 z-[60] bg-background overflow-y-auto">
        <div className="flex min-h-full items-start sm:items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 space-y-8 animate-in fade-in zoom-in duration-500 bg-gray-50/50 dark:bg-muted/20 border border-border">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-1">¡Datos importados!</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Se han procesado {pendingImportCount} transacciones
                </p>
              </div>
              <Button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await onConfirmImport();
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Confirmando...' : 'Ir al dashboard'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show import progress
  if (hasPendingImport && importProgress.status === 'loading') {
    return (
      <div className="fixed inset-0 lg:left-64 z-[60] bg-background overflow-y-auto">
        <div className="flex min-h-full items-start sm:items-center justify-center p-4">
          <Card className="w-full max-w-md lg:max-w-xl">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-lg font-semibold">Importando datos...</h2>
              <p className="text-sm text-muted-foreground">{importProgress.message}</p>

              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${importProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {importProgress.recordsProcessed || 0} registros procesados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show import error
  if (hasPendingImport && importProgress.status === 'failed') {
    return (
      <div className="fixed inset-0 lg:left-64 z-[60] bg-background overflow-y-auto">
        <div className="flex min-h-full items-start sm:items-center justify-center p-4">
          <div className="w-full max-w-md lg:max-w-xl space-y-4 py-8 sm:py-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error en la importación</AlertTitle>
              <AlertDescription>{importProgress.error || 'Ocurrió un error desconocido'}</AlertDescription>
            </Alert>
            <Button
              onClick={onCancelImport}
              className="w-full"
            >
              Volver atrás
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main decision panel
  return (
    <div className="fixed inset-0 lg:left-64 z-[60] bg-background overflow-y-auto">
      <div className="flex min-h-full items-start sm:items-center justify-center p-4">
        <div className="w-full max-w-lg lg:max-w-3xl space-y-4 sm:space-y-6 py-4 sm:py-0">
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center justify-center p-2 mb-4 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 animate-pulse">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">¡Bienvenido a tu Libertad Financiera!</h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
              Estás a un paso de tomar el control total. <br className="hidden sm:block" /> ¿Cómo prefieres que comencemos esta aventura?
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {/* Theme selector - Optional for onboarding */}
            {themeOptions && themeOptions.length > 0 && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Elige un tema</CardTitle>
                  <CardDescription className="text-xs">Personaliza el color base de la app</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-row flex-wrap gap-4 justify-center items-end my-2">
                    {themeOptions.map((theme) => (
                      <div key={theme.hex} className="flex flex-col items-center w-24">
                        <button
                          type="button"
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center transition-all",
                            selectedTheme === theme.hex ? "border-primary ring-2 ring-primary" : "border-border/40 hover:border-border"
                          )}
                          style={{ background: theme.hex }}
                          aria-label={theme.label}
                          onClick={() => {
                            setSelectedTheme(theme.hex);
                            onSelectTheme?.(theme.hex);
                          }}
                        >
                          {selectedTheme === theme.hex && (
                            <span className="w-6 h-6 rounded-full border-4 border-white bg-primary block shadow-lg" />
                          )}
                        </button>
                        <span className="text-xs mt-2 text-center break-words w-full font-medium text-muted-foreground">{theme.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start from scratch */}
            <Card
              className="group relative overflow-hidden cursor-pointer border-slate-200/60 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl hover:scale-[1.02] rounded-[32px] p-2"
              onClick={handleStartFromScratch}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="pb-4 pt-10 text-center relative z-10">
                <div className="mx-auto w-20 h-20 rounded-[24px] bg-slate-50 shadow-inner flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 ring-1 ring-slate-100 group-hover:ring-primary/20">
                  <Plus className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Comenzar desde cero</CardTitle>
                <CardDescription className="text-sm px-6 font-medium text-slate-500 leading-relaxed mt-2">
                  Ideal si prefieres registrar tus movimientos manualmente y construir tu historial paso a paso con total precisión.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10 pt-4 relative z-10">
                <Button
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl font-bold text-base shadow-lg shadow-primary/20 group-hover:shadow-primary/40 group-hover:translate-y-[-4px] transition-all duration-300"
                >
                  {isLoading ? 'Configurando...' : 'Empezar Limpio'}
                </Button>
              </CardContent>
            </Card>

            {/* Import data */}
            <Card
              className="group relative overflow-hidden cursor-pointer border-slate-200/60 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl hover:scale-[1.02] rounded-[32px] p-2"
              onClick={() => setShowImportDialog(true)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="pb-4 pt-10 text-center relative z-10">
                <div className="mx-auto w-20 h-20 rounded-[24px] bg-slate-50 shadow-inner flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500 ring-1 ring-slate-100 group-hover:ring-primary/20">
                  <Upload className="h-10 w-10 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Importar Historial</CardTitle>
                <CardDescription className="text-sm px-6 font-medium text-slate-500 leading-relaxed mt-2">
                  Sube tu archivo Excel o CSV para que procesemos tus datos automáticamente en segundos con IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10 pt-4 relative z-10">
                <Button
                  variant="outline"
                  className="w-full h-14 rounded-2xl font-bold text-base border-2 group-hover:bg-primary/5 group-hover:border-primary/40 group-hover:translate-y-[-4px] transition-all duration-300"
                >
                  Subir Archivo
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Slide progress indicators */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
            <div className="w-8 h-2.5 rounded-full bg-primary shadow-sm" />
          </div>
          <ImportExcelDialog
            paymentMethods={paymentMethods}
            onImport={async (transactions) => {
              try {
                await onImportComplete(transactions);
                return { error: null, count: transactions.length };
              } catch (error) {
                return { error, count: 0 };
              }
            }}
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            showTriggerButton={false}
            onboarding
          />
        </div>
      </div>
    </div>
  );
}



