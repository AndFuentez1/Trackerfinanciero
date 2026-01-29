import { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ImportProgress {
  status: 'idle' | 'loading' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  recordsProcessed?: number;
}

interface ThemeOption {
  label: string;
  hex: string;
}

interface OnboardingDecisionPanelProps {
  onStartFromScratch: () => Promise<void>;
  onImportData: () => void;
  hasPendingImport: boolean;
  onConfirmImport: () => Promise<void>;
  pendingImportCount: number;
  importProgress: ImportProgress;
  onCancelImport: () => void;
  showCompletionCard: boolean;
  baseColor: string;
  themeOptions: ThemeOption[];
  onSelectTheme: (hex: string) => void;
}

export function OnboardingDecisionPanel({
  onStartFromScratch,
  hasPendingImport,
  onConfirmImport,
  pendingImportCount,
  importProgress,
  onCancelImport,
  showCompletionCard,
  baseColor,
  themeOptions,
  onSelectTheme,
}: OnboardingDecisionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);

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
        <Card className="w-full max-w-md border rounded-xl shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">¡Datos importados!</h2>
              <p className="text-muted-foreground">
                Se han procesado {pendingImportCount} transacciones correctamente.
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
              className="w-full h-11 rounded-xl shadow-sm"
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
        <Card className="w-full max-w-md border rounded-xl shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold tracking-tight">Importando datos...</h2>
              <p className="text-sm text-muted-foreground">{importProgress.message}</p>
            </div>

            <div className="space-y-4">
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500 ease-out"
                  style={{ width: `${importProgress.progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center font-medium">
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
        <div className="w-full max-w-md space-y-6">
          <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold">Error en la importación</AlertTitle>
            <AlertDescription>{importProgress.error || 'Ocurrió un error desconocido'}</AlertDescription>
          </Alert>
          <Button
            onClick={onCancelImport}
            variant="outline"
            className="w-full h-11 rounded-xl border-primary/20"
          >
            Volver atrás
          </Button>
        </div>
      </div>
    );
  }

  // Main decision panel
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform hover:rotate-12 duration-300">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">¡Todo listo para empezar!</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Comienza a registrar tus transacciones y toma control de tus finanzas ahora mismo.
          </p>
        </div>

        <div className="space-y-4">
          {/* Theme Selection Section */}
          <Card className="border rounded-xl shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/30">
            <CardHeader className="pb-4 px-6 pt-6">
              <CardTitle className="text-lg font-bold">Personalizar tema</CardTitle>
              <CardDescription className="text-sm mt-1">Elige el color principal que prefieras para tu tablero</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex flex-wrap gap-3 justify-center">
                {themeOptions.map((theme) => (
                  <button
                    key={theme.hex}
                    onClick={() => onSelectTheme(theme.hex)}
                    className={cn(
                      "h-10 w-10 rounded-full transition-all border-2 flex items-center justify-center relative",
                      baseColor === theme.hex
                        ? "border-primary ring-4 ring-primary/20 scale-110 shadow-lg"
                        : "border-transparent hover:scale-110 hover:shadow-md"
                    )}
                    style={{ backgroundColor: theme.hex }}
                    title={theme.label}
                  >
                    {baseColor === theme.hex && (
                      <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start from scratch */}
          <Card
            className="group transition-all duration-300 border rounded-xl shadow-sm bg-card overflow-hidden hover:shadow-md hover:border-primary/30"
          >
            <CardHeader className="px-6 pt-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">Comenzar desde cero</CardTitle>
              <CardDescription className="text-sm mt-2 font-medium">
                Inicia con un tablero limpio y agrega tus transacciones manualmente a medida que ocurren.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-4">
              <Button
                onClick={handleStartFromScratch}
                className="w-full h-12 rounded-xl text-lg font-semibold shadow-sm transition-all hover:translate-y-[-2px] active:translate-y-0"
                disabled={isLoading}
              >
                {isLoading ? 'Cargando...' : 'Comenzar ahora'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4 pb-8">
          <p>Podrás importar datos masivamente más tarde desde la configuración de tu perfil</p>
        </div>
      </div>
    </div>
  );
}
