
-- Create pending_invoices table
create table if not exists public.pending_invoices (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    arrival_date timestamp with time zone not null default now(),
    amount numeric not null,
    description text not null,
    category text,
    status text not null default 'pending',
    user_id uuid not null references auth.users(id) on delete cascade,
    constraint pending_invoices_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.pending_invoices enable row level security;

-- Create policies
drop policy if exists "Users can view their own pending invoices" on public.pending_invoices;
create policy "Users can view their own pending invoices"
on public.pending_invoices for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pending invoices" on public.pending_invoices;
create policy "Users can insert their own pending invoices"
on public.pending_invoices for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pending invoices" on public.pending_invoices;
create policy "Users can update their own pending invoices"
on public.pending_invoices for update
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own pending invoices" on public.pending_invoices;
create policy "Users can delete their own pending invoices"
on public.pending_invoices for delete
to authenticated
using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.pending_invoices;
