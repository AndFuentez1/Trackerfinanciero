import { useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUserConfig } from '@/features/finance/hooks/useUserConfig';

/** Módulos opcionales que el usuario puede mostrar u ocultar desde Configuración. */
export interface FeatureFlags {
  /** Facturas Pendientes (pestañas "Incompletos" y "Listos" del panel de revisiones). */
  pendingInvoices: boolean;
  /** Zona de Reclasificación (pestaña "Errores Críticos": transacciones por clasificar). */
  reclassificationZone: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  pendingInvoices: true,
  reclassificationZone: true,
};

/** Normaliza el JSON guardado en `user_configs.feature_flags` (valores desconocidos → default). */
export function parseFeatureFlags(raw: unknown): FeatureFlags {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return (Object.keys(DEFAULT_FEATURE_FLAGS) as Array<keyof FeatureFlags>).reduce<FeatureFlags>(
    (acc, key) => ({
      ...acc,
      [key]: typeof source[key] === 'boolean' ? (source[key] as boolean) : DEFAULT_FEATURE_FLAGS[key],
    }),
    { ...DEFAULT_FEATURE_FLAGS }
  );
}

export function useFeatureFlags() {
  const { user } = useAuth();
  const { config, updateConfig } = useUserConfig(user?.id, user?.email);

  const flags = useMemo(() => parseFeatureFlags(config.feature_flags), [config.feature_flags]);

  const setFlag = useCallback(
    (key: keyof FeatureFlags, value: boolean) => updateConfig({ feature_flags: { ...flags, [key]: value } }),
    [flags, updateConfig]
  );

  return { flags, setFlag };
}
