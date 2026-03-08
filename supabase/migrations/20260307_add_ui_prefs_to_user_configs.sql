-- Migration: Add UI preference columns to user_configs
-- Date: 2026-03-07
-- Description: Moves currency_usage and password_dialog_shown from localStorage to Supabase
--              so they are correctly persisted across devices and sessions.

-- currency_usage: JSONB map of { "COP": 3, "USD": 1 } for ordering the currency selector
-- password_dialog_shown: flag to avoid showing "Add password?" dialog more than once

ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS currency_usage JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS password_dialog_shown BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_configs.currency_usage IS 'Map of currency code -> usage count for ordering the currency selector. Synced across devices.';
COMMENT ON COLUMN public.user_configs.password_dialog_shown IS 'Whether the "add a password?" prompt has been shown to this user. Prevents re-showing on new devices.';
