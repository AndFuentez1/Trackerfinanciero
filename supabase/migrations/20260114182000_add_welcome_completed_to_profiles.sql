-- Mark onboarding/welcome completion explicitly to avoid UI flicker while data loads
alter table public.profiles
  add column if not exists welcome_completed boolean default false;

-- Backfill for existing users that already completed onboarding flows
update public.profiles
set welcome_completed = true
where onboarding_decision is not null
  or has_pending_import = true
  or currency is not null;
