-- Optimistic UI needs the id before the round trip: the row has to appear in
-- the list the instant you hit save, and it needs a stable identity so a later
-- edit or delete targets the right thing.
--
-- So p_expense_id now means "this id" rather than "this existing row": insert
-- it if absent, update it if present. That also makes a retry after a dropped
-- connection idempotent instead of creating a duplicate.
--
-- Insert is still gated by the RLS WITH CHECK on expenses, so a non-member
-- writing into someone else's group is rejected exactly as before.
create or replace function public.save_expense(
  p_group_id             uuid,
  p_description          text,
  p_amount               bigint,
  p_paid_by              uuid,
  p_split_method         text,
  p_category             text,
  p_date                 date,
  p_participants         jsonb,
  p_note                 text default null,
  p_recurring_expense_id uuid default null,
  p_expense_id           uuid default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id    uuid := coalesce(p_expense_id, extensions.gen_random_uuid());
  v_total bigint;
begin
  select coalesce(sum((p->>'amount_owed')::bigint), 0)
    into v_total
  from jsonb_array_elements(p_participants) p;

  if v_total <> p_amount then
    raise exception
      'split does not add up: participants total % but the expense is %', v_total, p_amount
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_participants) = 0 then
    raise exception 'an expense needs at least one participant' using errcode = '22023';
  end if;

  insert into public.expenses (
    id, group_id, description, amount, paid_by, split_method, category, date, note,
    recurring_expense_id
  ) values (
    v_id, p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category, p_date,
    nullif(trim(coalesce(p_note, '')), ''), p_recurring_expense_id
  )
  on conflict (id) do update set
    description  = excluded.description,
    amount       = excluded.amount,
    paid_by      = excluded.paid_by,
    split_method = excluded.split_method,
    category     = excluded.category,
    date         = excluded.date,
    note         = excluded.note;

  delete from public.expense_participants where expense_id = v_id;

  insert into public.expense_participants (expense_id, member_id, input_value, amount_owed, position)
  select v_id,
         (p->>'member_id')::uuid,
         nullif(p->>'input_value', '')::numeric,
         (p->>'amount_owed')::bigint,
         coalesce((p->>'position')::int, ord::int - 1)
  from jsonb_array_elements(p_participants) with ordinality as t(p, ord);

  return v_id;
end;
$$;

create or replace function public.save_recurring_expense(
  p_group_id      uuid,
  p_description   text,
  p_amount        bigint,
  p_paid_by       uuid,
  p_split_method  text,
  p_category      text,
  p_frequency     text,
  p_start_date    date,
  p_next_due_date date,
  p_participants  jsonb,
  p_end_date      date default null,
  p_note          text default null,
  p_active        boolean default true,
  p_recurring_id  uuid default null
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id    uuid := coalesce(p_recurring_id, extensions.gen_random_uuid());
  v_total bigint;
begin
  select coalesce(sum((p->>'amount_owed')::bigint), 0)
    into v_total
  from jsonb_array_elements(p_participants) p;

  if v_total <> p_amount then
    raise exception
      'split does not add up: participants total % but the template is %', v_total, p_amount
      using errcode = '22023';
  end if;

  insert into public.recurring_expenses (
    id, group_id, description, amount, paid_by, split_method, category,
    frequency, start_date, next_due_date, end_date, active, note
  ) values (
    v_id, p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category,
    p_frequency, p_start_date, p_next_due_date, p_end_date, p_active,
    nullif(trim(coalesce(p_note, '')), '')
  )
  on conflict (id) do update set
    description   = excluded.description,
    amount        = excluded.amount,
    paid_by       = excluded.paid_by,
    split_method  = excluded.split_method,
    category      = excluded.category,
    frequency     = excluded.frequency,
    start_date    = excluded.start_date,
    next_due_date = excluded.next_due_date,
    end_date      = excluded.end_date,
    active        = excluded.active,
    note          = excluded.note;

  delete from public.recurring_participants where recurring_id = v_id;

  insert into public.recurring_participants (recurring_id, member_id, input_value, amount_owed, position)
  select v_id,
         (p->>'member_id')::uuid,
         nullif(p->>'input_value', '')::numeric,
         (p->>'amount_owed')::bigint,
         coalesce((p->>'position')::int, ord::int - 1)
  from jsonb_array_elements(p_participants) with ordinality as t(p, ord);

  return v_id;
end;
$$;
