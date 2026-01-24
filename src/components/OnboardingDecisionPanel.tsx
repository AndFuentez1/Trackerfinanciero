import { useState } from 'react';
import { Upload, Plus, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImportExcelDialog } from './finance/ImportExcelDialog';
import { PaymentMethod, Transaction } from '@/hooks/useFinanceData';
import { cn } from '@/lib/utils';

interface ThemeOption {
  label: string;
  hex: string;
}

interface ImportProgress {
  status: 'idle' | 'loading' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  recordsProcessed?: number;
}

interface OnboardingDecisionPanelProps {
  onStartFromScratch: () => Promise<void>;
  onImportData: () => void;
  hasPendingImport: boolean;
  onConfirmImport: () => Promise<void>;
  pendingImportCount: number;
  importProgress: ImportProgress;
  onCancelImport: () => void;
  paymentMethods: PaymentMethod[];
  onImportComplete: (data: Omit<Transaction, 'id'>[]) => void;
  showCompletionCard: boolean;
  baseColor?: string;
  themeOptions?: ThemeOption[];
  onSelectTheme?: (hex: string) => void;
}

export function OnboardingDecisionPanel({
  onStartFromScratch,
  onImportData,
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(baseColor);

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-success/20 bg-success/5">
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
    );
  }

  // Show import progress
  if (hasPendingImport && importProgress.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
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
    );
  }

  // Show import error
  if (hasPendingImport && importProgress.status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md space-y-4">
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
    );
  }

  // Main decision panel
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">¿Cómo deseas comenzar?</h1>
          <p className="text-muted-foreground">
            Elige entre empezar desde cero o importar tus datos
          </p>
        </div>

        <div className="grid gap-4">
          {/* Theme selector - Optional for onboarding */}
          {themeOptions && themeOptions.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Elige un tema</CardTitle>
                <CardDescription className="text-xs">Personaliza el color base de la app</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.hex}
                      onClick={() => {
                        setSelectedTheme(theme.hex);
                      }}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1",
                        selectedTheme === theme.hex
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-border hover:border-primary"
                      )}
                      style={{ backgroundColor: `${theme.hex}20` }}
                      title={theme.label}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-white shadow-md flex items-center justify-center"
                        style={{ backgroundColor: theme.hex }}
                      >
                        {selectedTheme === theme.hex && (
                          <Check className="w-3 h-3 text-white drop-shadow-md" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full mt-4"
                  variant="default"
                  onClick={() => onSelectTheme?.(selectedTheme)}
                >
                  Aplicar color
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Start from scratch */}
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Plus className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <CardTitle className="text-base">Comenzar desde cero</CardTitle>
                  <CardDescription className="text-xs">
                    Crea transacciones nuevas desde ahora
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleStartFromScratch}
                disabled={isLoading}
                className="w-full"
                size="sm"
              >
                {isLoading ? 'Cargando...' : 'Comenzar'}
              </Button>
            </CardContent>
          </Card>

          {/* Import data - COMENTADO */}
          {/* 
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-success mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <CardTitle className="text-base">Importar datos</CardTitle>
                  <CardDescription className="text-xs">
                    Carga un archivo Excel con tus datos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowImportDialog(true)}
                variant="default"
                className="w-full"
                size="sm"
              >
                Seleccionar archivo
              </Button>
            </CardContent>
          </Card>
          */}
        </div>

        {/* Import Dialog - integrated */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md relative">
              <button
                onClick={() => setShowImportDialog(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <ImportExcelDialog
                paymentMethods={paymentMethods}
                onImport={async (transactions) => {
                  onImportComplete(transactions);
                  setShowImportDialog(false);
                  return { error: null, count: transactions.length };
                }}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
