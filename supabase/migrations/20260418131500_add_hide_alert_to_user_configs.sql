-- Migration: Add hide_incomplete_alert to user_configs
-- Date: 2026-04-18
-- Description: Adds hide_incomplete_alert column to user_configs to enable saving state of alert panels.

ALTER TABLE public.user_configs
  ADD COLUMN IF NOT EXISTS hide_incomplete_alert BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS keep_session_alive BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_configs.hide_incomplete_alert IS 'Whether the incomplete transactions and pending invoices alerts are hidden by the user.';
COMMENT ON COLUMN public.user_configs.keep_session_alive IS 'Whether the user wants to keep the session alive.';
