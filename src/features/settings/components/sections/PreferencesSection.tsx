import { useRef, useState, type ChangeEvent } from 'react';
import { LayoutGrid, Download, Upload, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Switch } from '@/shared/ui/switch';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';
import { useToast } from '@/shared/hooks/use-toast';
import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';
import { useFeatureFlags, type FeatureFlags } from '../../hooks/useFeatureFlags';
import { buildConfigExport, parseConfigImport } from '../../utils/configPortability';

const MODULES: Array<{ key: keyof FeatureFlags; title: string; description: string }> = [
  {
    key: 'pendingInvoices',
    title: 'Facturas Pendientes',
    description: 'Facturas de Gmail/IA incompletas o listas para aprobar en el Historial.',
  },
  {
    key: 'reclassificationZone',
    title: 'Zona de Reclasificación',
    description: 'Transacciones "Por clasificar" que requieren una categoría.',
  },
];

/**
 * Preferencias: módulos opcionales visibles y portabilidad (exportar/importar) de la configuración.
 */
export function PreferencesSection() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { config, updateConfig } = useUserConfig(user?.id, user?.email);
  const { flags, setFlag } = useFeatureFlags();
  const { baseColor, decimalPlaces, updateProfile } = useFinanceData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    const payload = buildConfigExport({
      baseColor: baseColor ?? null,
      decimalPlaces,
      keepSessionAlive: config.keep_session_alive,
      hideIncompleteAlert: config.hide_incomplete_alert,
      savingsViewMode: config.savings_view_mode ?? 'monthly',
      featureFlags: flags,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fintrack-configuracion.json';
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Configuración exportada', description: 'Importa el archivo en otro dispositivo para aplicar tus preferencias.' });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) { return; }

    setImporting(true);
    try {
      const prefs = parseConfigImport(await file.text());

      const configUpdates: Parameters<typeof updateConfig>[0] = {};
      if (prefs.keepSessionAlive !== undefined) { configUpdates.keep_session_alive = prefs.keepSessionAlive; }
      if (prefs.hideIncompleteAlert !== undefined) { configUpdates.hide_incomplete_alert = prefs.hideIncompleteAlert; }
      if (prefs.savingsViewMode !== undefined) { configUpdates.savings_view_mode = prefs.savingsViewMode; }
      if (prefs.featureFlags) { configUpdates.feature_flags = { ...prefs.featureFlags }; }
      if (Object.keys(configUpdates).length > 0) { await updateConfig(configUpdates); }

      const profileUpdates: Parameters<typeof updateProfile>[0] = {};
      if (prefs.baseColor) { profileUpdates.base_color = prefs.baseColor; }
      if (prefs.decimalPlaces !== undefined) { profileUpdates.decimal_places = prefs.decimalPlaces; }
      if (Object.keys(profileUpdates).length > 0) { await updateProfile(profileUpdates); }

      toast({ title: 'Configuración importada', description: 'Tus preferencias se aplicaron correctamente.' });
    } catch (error) {
      toast({
        title: 'No se pudo importar',
        description: error instanceof Error ? error.message : 'Archivo inválido.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card id="preferences" className="rounded-2xl shadow-sm border-border bg-muted/20 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="flex shrink-0 items-center justify-center p-1">
            <LayoutGrid className="h-5 w-5 text-primary" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-none">
              Módulos y preferencias
            </h2>
            <p className="text-[15px] text-muted-foreground mt-1 leading-tight">
              Muestra u oculta secciones y lleva tu configuración a otro dispositivo
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {MODULES.map((module) => {
            const id = `module-${module.key}`;
            return (
              <div key={module.key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor={id} className="text-[15px] font-semibold text-foreground">{module.title}</Label>
                  <p id={`${id}-desc`} className="text-sm text-muted-foreground">{module.description}</p>
                </div>
                <Switch
                  id={id}
                  checked={flags[module.key]}
                  onCheckedChange={(checked) => { void setFlag(module.key, checked); }}
                  aria-describedby={`${id}-desc`}
                />
              </div>
            );
          })}
        </div>

        <Separator className="opacity-50" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">Portabilidad</p>
            <p className="text-sm text-muted-foreground">
              Tema, decimales, sesión y módulos. No incluye datos financieros ni la moneda.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              {importing
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                : <Upload className="h-4 w-4" aria-hidden="true" />}
              Importar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
              aria-label="Archivo de configuración"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
