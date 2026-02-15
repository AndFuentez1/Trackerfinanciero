-- Add cashflow_use_real_balance to user_configs for Cash Flow toggle persistence
alter table public.user_configs
  add column if not exists cashflow_use_real_balance boolean default false;

comment on column public.user_configs.cashflow_use_real_balance
  is 'Sincronizar flujo de caja con saldo real';
