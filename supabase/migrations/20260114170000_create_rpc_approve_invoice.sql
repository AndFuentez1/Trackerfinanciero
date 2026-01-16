
-- RPC Function to Approve Pending Invoice with Smart Category Creation
create or replace function public.approve_pending_invoice(
    p_invoice_id uuid,
    p_user_id uuid,
    p_category_name text,
    p_payment_method_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
    v_category_id uuid;
    v_amount numeric;
    v_description text;
    v_date timestamp with time zone;
    v_new_category boolean := false;
begin
    -- 1. Get invoice details
    select amount, description, arrival_date
    into v_amount, v_description, v_date
    from public.pending_invoices
    where id = p_invoice_id and user_id = p_user_id;

    if not found then
        raise exception 'Invoice not found or access denied';
    end if;

    -- 2. Normalize and Find/Create Category
    -- standardizing input: trim whitespace and lowercase for comparison, but store with proper casing if new? 
    -- User request: "Trim + lowercase" for normalization.
    
    select id into v_category_id
    from public.categories
    where lower(trim(name)) = lower(trim(p_category_name))
    and user_id = p_user_id
    limit 1;

    if v_category_id is null then
        -- Create new category
        insert into public.categories (name, user_id, type, color)
        values (trim(p_category_name), p_user_id, 'expense', '#9CA3AF') -- Default gray color
        returning id into v_category_id;
        v_new_category := true;
    end if;

    -- 3. Insert into Transactions
    insert into public.transactions (
        user_id,
        amount,
        description,
        date,
        type,
        category_id,
        payment_method_id,
        created_at
    )
    values (
        p_user_id,
        v_amount,
        v_description,
        v_date,
        'expense', -- Invoices are expenses
        v_category_id,
        p_payment_method_id,
        now()
    );

    -- 4. Delete from Pending Invoices
    delete from public.pending_invoices
    where id = p_invoice_id;

    return true;
end;
$$;
