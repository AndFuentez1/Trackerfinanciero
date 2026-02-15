-- Add telegram_verified_at to user_configs for Telegram connection verification
alter table public.user_configs
  add column if not exists telegram_verified_at timestamptz;
