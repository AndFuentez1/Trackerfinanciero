-- 20261018121000_user_configs_feature_flags.sql
-- Módulos opcionales que el usuario muestra/oculta desde Configuración (sincronizado entre dispositivos).
-- Claves actuales: pendingInvoices, reclassificationZone (booleans). Ausente = visible.

ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_configs
  DROP CONSTRAINT IF EXISTS user_configs_feature_flags_object_check;
ALTER TABLE public.user_configs
  ADD CONSTRAINT user_configs_feature_flags_object_check
  CHECK (jsonb_typeof(feature_flags) = 'object');

COMMENT ON COLUMN public.user_configs.feature_flags IS
  'Visibilidad de módulos opcionales (pendingInvoices, reclassificationZone). Ausente = visible.';
