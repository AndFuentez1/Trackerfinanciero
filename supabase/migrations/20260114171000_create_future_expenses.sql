
-- Create future_expenses table
create table if not exists public.future_expenses (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    payment_date date not null,
    amount numeric not null,
    description text not null,
    category_id uuid references public.categories(id) on delete set null,
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending', -- 'pending', 'paid'
    constraint future_expenses_pkey primary key (id)
);

-- Enable RLS
alter table public.future_expenses enable row level security;

-- Policies
create policy "Users can view their own future expenses"
on public.future_expenses for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own future expenses"
on public.future_expenses for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own future expenses"
on public.future_expenses for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own future expenses"
on public.future_expenses for delete
to authenticated
using (auth.uid() = user_id);
