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
            <h1 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">¡Bienvenido a tu Libertad Financiera!</h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed font-medium">
              Estás a un paso de tomar el control total. <br className="hidden sm:block" /> ¿Cómo prefieres que comencemos esta aventura?
            </p>
          </div>

          <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
            {/* Theme selector - Optional for onboarding */}
            {themeOptions && themeOptions.length > 0 && (
              <Card className="group relative overflow-hidden border-slate-200/60 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl hover:scale-[1.02] rounded-[32px] p-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="pb-2 pt-6 text-center relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Paso 1</span>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-800">Elige un tema</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-500 mt-2">Personaliza el color base de la app</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 pb-6 relative z-10">
                  <div className="flex flex-row flex-wrap gap-4 justify-center items-end my-2">
                    {themeOptions.map((theme) => (
                      <div key={theme.hex} className="flex flex-col items-center w-24">
                        <button
                          type="button"
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center transition-all",
                            selectedTheme === theme.hex ? "border-primary ring-2 ring-primary scale-110" : "border-border/40 hover:border-border hover:scale-105"
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
                        <span className="text-xs mt-3 text-center break-words w-full font-medium text-muted-foreground">{theme.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision options combined into a single visual panel */}
            <Card className="group/main relative overflow-hidden border-slate-200/60 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl rounded-[32px] p-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
              <CardHeader className="pb-2 pt-6 text-center relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">Paso 2</span>
                <CardTitle className="text-2xl font-black tracking-tight text-slate-800">¿Cómo prefieres empezar?</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col gap-4">

                {/* Start from scratch */}
                <div
                  className="group relative overflow-hidden cursor-pointer border-2 border-slate-100/60 hover:border-primary/40 transition-all duration-300 bg-white hover:bg-slate-50/80 hover:shadow-lg hover:-translate-y-1 rounded-[24px] p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left"
                  onClick={handleStartFromScratch}
                >
                  <div className="w-16 h-16 shrink-0 rounded-[20px] bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300 ring-1 ring-slate-100 group-hover:ring-primary/20">
                    <Plus className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Comenzar desde cero</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm mx-auto sm:mx-0">
                      Ideal para registrar manualmente paso a paso.
                    </p>
                  </div>
                  <Button
                    disabled={isLoading}
                    className="w-full sm:w-auto mt-2 sm:mt-0 rounded-xl font-bold shadow-sm"
                  >
                    {isLoading ? 'Configurando...' : 'Empezar Limpio'}
                  </Button>
                </div>

                {/* Import data */}
                <div
                  className="group relative overflow-hidden cursor-pointer border-2 border-slate-100/60 hover:border-primary/40 transition-all duration-300 bg-white hover:bg-slate-50/80 hover:shadow-lg hover:-translate-y-1 rounded-[24px] p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left"
                  onClick={() => setShowImportDialog(true)}
                >
                  <div className="w-16 h-16 shrink-0 rounded-[20px] bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300 ring-1 ring-slate-100 group-hover:ring-primary/20">
                    <Upload className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Importar Historial</h3>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-sm mx-auto sm:mx-0">
                      Sube tu Excel o CSV para procesar datos con IA.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto mt-2 sm:mt-0 rounded-xl font-bold border-2 group-hover:bg-primary/5 group-hover:border-primary/40 transition-colors duration-300"
                  >
                    Subir Archivo
                  </Button>
                </div>

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



