-- Add message_id to pending_invoices for Gmail duplicate tracking
alter table public.pending_invoices
  add column if not exists message_id text;

create unique index if not exists idx_pending_invoices_user_message_id
  on public.pending_invoices(user_id, message_id)
  where message_id is not null;
