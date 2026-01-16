create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "user_id" uuid not null,
    "type" text not null,
    "icon" text,
    "color" text
);


alter table "public"."categories" enable row level security;

create unique index categories_pkey on public.categories using btree (id);

alter table "public"."categories" add constraint "categories_pkey" primary key using index "categories_pkey";

alter table "public"."categories" add constraint "categories_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade not valid;

alter table "public"."categories" validate constraint "categories_user_id_fkey";

create policy "Users can delete their own categories"
on "public"."categories"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own categories"
on "public"."categories"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can select their own categories"
on "public"."categories"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own categories"
on "public"."categories"
as permissive
for update
to public
using ((auth.uid() = user_id));

-- Add some default categories for existing users? 
-- It's hard to do this in SQL for all users without a function, 
-- but we can't easily iterate users here. 
-- Instead, the frontend should handle "default" categories if the list is empty, 
-- or we can create a function to initialize text.

-- However, since the user complained about existing structure, let's just create the table.
-- We will also modify the frontend to fallback to defaults if no categories exist in DB, 
-- or provide a button to "initialize defaults".
