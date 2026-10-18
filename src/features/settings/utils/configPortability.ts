import { z } from 'zod';
import { DEFAULT_FEATURE_FLAGS, parseFeatureFlags, type FeatureFlags } from '../hooks/useFeatureFlags';

/**
 * Exportación/importación de preferencias personales entre dispositivos o cuentas.
 * Solo incluye preferencias de presentación: nunca datos financieros, credenciales ni la moneda
 * (cambiar la moneda implica convertir montos y se hace desde su propia sección).
 */

export const CONFIG_EXPORT_VERSION = 1;
export const CONFIG_EXPORT_KIND = 'fintrack-config';

export interface PortablePreferences {
  baseColor: string | null;
  decimalPlaces: number;
  keepSessionAlive: boolean;
  hideIncompleteAlert: boolean;
  savingsViewMode: 'monthly' | 'annual';
  featureFlags: FeatureFlags;
}

const preferencesSchema = z.object({
  baseColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  decimalPlaces: z.number().int().min(0).max(4).optional(),
  keepSessionAlive: z.boolean().optional(),
  hideIncompleteAlert: z.boolean().optional(),
  savingsViewMode: z.enum(['monthly', 'annual']).optional(),
  featureFlags: z.record(z.boolean()).optional(),
});

const exportFileSchema = z.object({
  kind: z.literal(CONFIG_EXPORT_KIND),
  version: z.number().int().positive(),
  exportedAt: z.string().optional(),
  preferences: preferencesSchema,
});

export type ImportedPreferences = Partial<PortablePreferences>;

export function buildConfigExport(prefs: PortablePreferences, now: Date = new Date()) {
  return {
    kind: CONFIG_EXPORT_KIND,
    version: CONFIG_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    preferences: prefs,
  };
}

/** Valida el contenido de un archivo exportado. Lanza Error con mensaje legible si no es válido. */
export function parseConfigImport(text: string): ImportedPreferences {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  const parsed = exportFileSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error('El archivo no corresponde a una configuración de FinTrack.');
  }
  if (parsed.data.version > CONFIG_EXPORT_VERSION) {
    throw new Error('El archivo fue creado con una versión más reciente de la app.');
  }

  const { featureFlags, baseColor, ...rest } = parsed.data.preferences;
  const result: ImportedPreferences = { ...rest };
  if (baseColor !== undefined) { result.baseColor = baseColor; }
  if (featureFlags) { result.featureFlags = parseFeatureFlags({ ...DEFAULT_FEATURE_FLAGS, ...featureFlags }); }
  return result;
}
