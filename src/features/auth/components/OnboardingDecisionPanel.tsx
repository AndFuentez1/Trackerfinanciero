import { useState } from 'react';
import { Upload, Plus, CheckCircle2, AlertCircle, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImportExcelDialog } from '@/features/transactions/components/ImportExcelDialog';
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
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">¡Todo listo para empezar!</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Solo una decisión más: ¿Cómo quieres poblar tu tablero financiero?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-4">
          {/* Start from scratch */}
          <Card
            className="cursor-pointer group hover:border-primary hover:shadow-lg transition-all duration-300 relative overflow-hidden"
            onClick={handleStartFromScratch}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Comenzar desde cero</CardTitle>
              <CardDescription>
                Inicia con un tablero limpio y agrega tus transacciones manualmente a medida que ocurren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground border-primary/20"
                disabled={isLoading}
              >
                {isLoading ? 'Cargando...' : 'Seleccionar'}
              </Button>
            </CardContent>
          </Card>

          {/* Import data */}
          <Card
            className="cursor-pointer group hover:border-primary hover:shadow-lg transition-all duration-300 relative overflow-hidden"
            onClick={() => setShowImportDialog(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-6 w-6 text-emerald-600" />
              </div>
              <CardTitle>Importar Excel</CardTitle>
              <CardDescription>
                Si ya tienes un historial, carga tu archivo Excel para poblar tu tablero instantáneamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full group-hover:bg-emerald-600 group-hover:text-white border-primary/20"
              >
                Subir archivo
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-8">
          <p>Podrás importar datos más tarde desde la configuración</p>
        </div>

        {/* Import Dialog - integrated */}
        {showImportDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md relative shadow-2xl animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowImportDialog(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-full transition-colors"
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
