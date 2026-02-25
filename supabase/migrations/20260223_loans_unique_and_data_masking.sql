-- ============================================================================
-- DATA MASKING & LOAN INTEGRITY PATCH (2026-02-23)
-- ============================================================================
-- 1. Unique constraint on loans to prevent duplicate inserts at DB level
-- 2. Masked view over user_configs (hides tokens from direct SQL queries)
-- 3. Audit columns on user_configs for credential rotation tracking
-- ============================================================================
-- NOTE: Field-level encryption is handled entirely by the Node.js backend
-- (encryption.service.js → AES-256-CBC, key derived per user via scrypt).
-- Tokens in user_configs columns are NEVER plain text — they are stored as
-- "iv:ciphertext" hex. The SQL layer masks them as an additional display guard.
-- ============================================================================

-- ============================================================================
-- 1. LOANS: Prevent duplicate rows at DB level (same user + same loan name)
-- ============================================================================
ALTER TABLE public.loans
  DROP CONSTRAINT IF EXISTS loans_user_name_unique;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_user_name_unique
  UNIQUE (user_id, name);

-- ============================================================================
-- 2. MASKED VIEW for user_configs
-- Protects credential columns from accidental exposure in direct SQL queries
-- (e.g. Supabase dashboard → Table editor, or poorly scoped admin queries).
-- The Node.js backend reads the base table directly via service_role.
-- ============================================================================
DROP VIEW IF EXISTS public.user_configs_masked;

CREATE VIEW public.user_configs_masked
WITH (security_invoker = true)
AS
SELECT
  id,
  email,
  -- Credentials: already AES-256 encrypted by Node.js backend.
  -- This view masks even the ciphertext so it is invisible via SQL browsing.
  CASE
    WHEN gmail_tokens IS NOT NULL AND gmail_tokens != '' THEN '***CONNECTED***'
    ELSE NULL
  END AS gmail_tokens,
  CASE
    WHEN gemini_api_key IS NOT NULL AND gemini_api_key != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS gemini_api_key,
  CASE
    WHEN telegram_bot_token IS NOT NULL AND telegram_bot_token != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS telegram_bot_token,
  CASE
    WHEN telegram_chat_id IS NOT NULL AND telegram_chat_id != '' THEN '***CONFIGURED***'
    ELSE NULL
  END AS telegram_chat_id,
  -- Non-sensitive metadata: visible as-is
  gmail_connected_at,
  gemini_configured_at,
  telegram_configured_at,
  notify_rules_exceptions,
  notify_ai_exceptions,
  created_at,
  updated_at
FROM public.user_configs
WHERE auth.uid() = id;

COMMENT ON VIEW public.user_configs_masked IS
  'Read-only view of user_configs. Credential columns are masked — they are '
  'already AES-256 encrypted by the backend, but this view hides ciphertext too. '
  'Backend reads the base table directly via service_role.';

-- ============================================================================
-- 3. AUDIT COLUMNS on user_configs
-- Track last time each credential was rotated (written/changed).
-- ============================================================================
ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS gemini_key_updated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_token_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_tokens_updated_at    TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.audit_user_configs_credential_rotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gemini_api_key IS DISTINCT FROM OLD.gemini_api_key THEN
    NEW.gemini_key_updated_at := now();
  END IF;

  IF NEW.telegram_bot_token IS DISTINCT FROM OLD.telegram_bot_token
    OR NEW.telegram_chat_id IS DISTINCT FROM OLD.telegram_chat_id THEN
    NEW.telegram_token_updated_at := now();
  END IF;

  IF NEW.gmail_tokens IS DISTINCT FROM OLD.gmail_tokens THEN
    NEW.gmail_tokens_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_configs_credential_audit ON public.user_configs;
CREATE TRIGGER trg_user_configs_credential_audit
BEFORE UPDATE ON public.user_configs
FOR EACH ROW
EXECUTE FUNCTION public.audit_user_configs_credential_rotation();

-- ============================================================================
-- 4. COMMENTS for documentation
-- ============================================================================
COMMENT ON COLUMN public.user_configs.gemini_api_key     IS 'AES-256-CBC encrypted by Node.js backend (encryption.service.js). Format: iv:ciphertext (hex).';
COMMENT ON COLUMN public.user_configs.telegram_bot_token IS 'AES-256-CBC encrypted by Node.js backend (encryption.service.js). Format: iv:ciphertext (hex).';
COMMENT ON COLUMN public.user_configs.telegram_chat_id   IS 'Plain text Telegram Chat ID (numeric, non-secret). Masked at view layer.';
COMMENT ON COLUMN public.user_configs.gmail_tokens       IS 'AES-256-CBC encrypted JSON bundle (encryption.service.js). Never expose to frontend.';
