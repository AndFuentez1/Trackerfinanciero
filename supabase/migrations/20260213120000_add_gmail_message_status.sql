-- Track Gmail invoice message status (read/approved)
create table if not exists public.gmail_message_status (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,
  status text not null default 'unread',
  read_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint gmail_message_status_pkey primary key (id),
  constraint gmail_message_status_unique unique (user_id, message_id),
  constraint gmail_message_status_check check (status in ('unread', 'read', 'approved'))
);

create index if not exists idx_gmail_message_status_user
  on public.gmail_message_status(user_id);

create index if not exists idx_gmail_message_status_user_status
  on public.gmail_message_status(user_id, status);

alter table public.gmail_message_status enable row level security;

create policy "Users can view their own Gmail statuses"
on public.gmail_message_status for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own Gmail statuses"
on public.gmail_message_status for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own Gmail statuses"
on public.gmail_message_status for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own Gmail statuses"
on public.gmail_message_status for delete
to authenticated
using (auth.uid() = user_id);

alter publication supabase_realtime add table public.gmail_message_status;
