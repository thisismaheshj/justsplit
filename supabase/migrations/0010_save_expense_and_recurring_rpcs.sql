-- ============================================================================
-- Phase 4d: writing an expense is two inserts that must not half succeed.
--
-- An expense with no split rows is a corrupt ledger entry: it counts towards
-- the total but nobody owes it, so balances stop summing to zero. Doing the
-- two writes from the client cannot be atomic, and doing them in one statement
-- does not work either -- a data-modifying CTE's rows are invisible to the RLS
-- policy that checks them, which is what rejected the first attempt.
--
-- SECURITY INVOKER on purpose (the default): RLS still applies to every
-- statement inside, so this is a transaction boundary, not a privilege
-- escalation. A non-member gets exactly the same rejection as before.
--
-- It also enforces the invariant the whole app rests on: the parts must add up
-- to the whole, exactly, in integer minor units.
--
-- (search_path is pinned in migration 0012.)
-- ============================================================================

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
as $$
declare
  v_id    uuid;
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

  if p_expense_id is null then
    insert into public.expenses (
      group_id, description, amount, paid_by, split_method, category, date, note,
      recurring_expense_id
    ) values (
      p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category, p_date,
      nullif(trim(coalesce(p_note, '')), ''), p_recurring_expense_id
    )
    returning id into v_id;
  else
    update public.expenses set
      description = p_description,
      amount      = p_amount,
      paid_by     = p_paid_by,
      split_method= p_split_method,
      category    = p_category,
      date        = p_date,
      note        = nullif(trim(coalesce(p_note, '')), '')
    where id = p_expense_id
    returning id into v_id;

    if v_id is null then
      -- Either it does not exist or RLS filtered it. Same answer either way,
      -- so this is not a probe for which groups exist.
      raise exception 'expense not found' using errcode = 'P0002';
    end if;

    delete from public.expense_participants where expense_id = v_id;
  end if;

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

revoke all on function public.save_expense(uuid, text, bigint, uuid, text, text, date, jsonb, text, uuid, uuid) from public, anon;
grant execute on function public.save_expense(uuid, text, bigint, uuid, text, text, date, jsonb, text, uuid, uuid) to authenticated;

-- Same shape for recurring templates.
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
as $$
declare
  v_id    uuid;
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

  if p_recurring_id is null then
    insert into public.recurring_expenses (
      group_id, description, amount, paid_by, split_method, category,
      frequency, start_date, next_due_date, end_date, active, note
    ) values (
      p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category,
      p_frequency, p_start_date, p_next_due_date, p_end_date, p_active,
      nullif(trim(coalesce(p_note, '')), '')
    )
    returning id into v_id;
  else
    update public.recurring_expenses set
      description   = p_description,
      amount        = p_amount,
      paid_by       = p_paid_by,
      split_method  = p_split_method,
      category      = p_category,
      frequency     = p_frequency,
      start_date    = p_start_date,
      next_due_date = p_next_due_date,
      end_date      = p_end_date,
      active        = p_active,
      note          = nullif(trim(coalesce(p_note, '')), '')
    where id = p_recurring_id
    returning id into v_id;

    if v_id is null then
      raise exception 'recurring expense not found' using errcode = 'P0002';
    end if;

    delete from public.recurring_participants where recurring_id = v_id;
  end if;

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

revoke all on function public.save_recurring_expense(uuid, text, bigint, uuid, text, text, text, date, date, jsonb, date, text, boolean, uuid) from public, anon;
grant execute on function public.save_recurring_expense(uuid, text, bigint, uuid, text, text, text, date, date, jsonb, date, text, boolean, uuid) to authenticated;
