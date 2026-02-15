-- Allow archived/deleted statuses and migrate legacy 'approved' to 'archived'
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'gmail_message_status'
  ) then
    update public.gmail_message_status
    set status = 'archived'
    where status = 'approved';

    alter table public.gmail_message_status
      drop constraint if exists gmail_message_status_check;

    alter table public.gmail_message_status
      add constraint gmail_message_status_check
      check (status in ('unread', 'read', 'archived', 'deleted'));
  end if;
end $$;
