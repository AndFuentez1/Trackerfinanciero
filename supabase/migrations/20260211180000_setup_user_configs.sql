-- Migration: Setup user_configs (consolidated from backend/migrations 001, 002, 003)
-- Date: 2026-02-11
-- Description: Ensures user_configs table and notification preference columns exist with correct names.

-- 1. Create table if not exists (base structure from 001)
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Encrypted credentials
  gmail_tokens TEXT,
  gemini_api_key TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  
  -- Metadata
  gmail_connected_at TIMESTAMPTZ,
  gemini_configured_at TIMESTAMPTZ,
  telegram_configured_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Handle Column Renames (upgrade from 002 -> 003)
DO $$
BEGIN
  -- notify_on_invoice -> notify_rules_exceptions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_on_invoice') THEN
    ALTER TABLE public.user_configs RENAME COLUMN notify_on_invoice TO notify_rules_exceptions;
  END IF;

  -- notify_on_agent -> notify_ai_exceptions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_on_agent') THEN
    ALTER TABLE public.user_configs RENAME COLUMN notify_on_agent TO notify_ai_exceptions;
  END IF;
END $$;

-- 3. Add default notification columns if they are still missing (upgrade from 001 -> 003)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_rules_exceptions') THEN
    ALTER TABLE public.user_configs ADD COLUMN notify_rules_exceptions BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_configs' AND column_name = 'notify_ai_exceptions') THEN
    ALTER TABLE public.user_configs ADD COLUMN notify_ai_exceptions BOOLEAN DEFAULT FALSE;
  END IF;

END $$;

-- 4. Enable RLS
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DROP POLICY IF EXISTS "Users can manage their own config" ON public.user_configs;
CREATE POLICY "Users can manage their own config"
  ON public.user_configs
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_configs_email ON public.user_configs(email);
CREATE INDEX IF NOT EXISTS idx_user_configs_id ON public.user_configs(id);

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_user_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_configs_updated_at ON public.user_configs;
CREATE TRIGGER trigger_update_user_configs_updated_at
  BEFORE UPDATE ON public.user_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_configs_updated_at();

-- 8. Comments
COMMENT ON TABLE public.user_configs IS 'Per-user configuration for invoice processing and notifications';
COMMENT ON COLUMN public.user_configs.notify_rules_exceptions IS 'Notificar si las reglas fallan (Categoría: Otros)';
COMMENT ON COLUMN public.user_configs.notify_ai_exceptions IS 'Notificar si la IA falla (Categoría: Otros)';
