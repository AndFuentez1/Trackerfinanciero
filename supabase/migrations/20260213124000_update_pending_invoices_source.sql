-- Add source field for pending_invoices and relax message_id uniqueness
alter table public.pending_invoices
  add column if not exists source text;

drop index if exists idx_pending_invoices_user_message_id;

create index if not exists idx_pending_invoices_user_message_id
  on public.pending_invoices(user_id, message_id)
  where message_id is not null;
