-- ============================================================================
-- Only the person who added an expense can change it, and only twice.
--
-- Until now every member could edit or delete any expense in their group
-- (0009). Now:
--   * each expense records who added it (created_by);
--   * only that person can edit or delete it;
--   * an expense can be edited at most twice; edit_count and edited_at let the
--     app say "Edited" next to it.
--
-- All of it is enforced here, not just hidden in the app, so a direct call to
-- the API cannot get round it. The split rows (expense_participants) can only
-- be rewritten inside save_expense, which is where edits are counted; writing
-- them directly would otherwise change who owes what without it showing.
--
-- Deleting a whole group is unaffected: unwind_group_ledger (0011) runs as
-- the table owner, which row-level security does not apply to.
-- ============================================================================

alter table public.expenses
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists edit_count smallint not null default 0,
  add column if not exists edited_at  timestamptz;

alter table public.expenses drop constraint if exists expenses_edit_count_range;
alter table public.expenses
  add constraint expenses_edit_count_range check (edit_count between 0 and 2);

-- Existing expenses never recorded who added them. The payer is the best
-- stand-in; when the payer has no account, the group's creator.
update public.expenses e
set created_by = coalesce(
  (select m.user_id from public.group_members m where m.id = e.paid_by),
  (select g.created_by from public.groups g where g.id = e.group_id)
)
where e.created_by is null;

create index if not exists expenses_by_creator on public.expenses (created_by);

-- ---------------------------------------------------------------- triggers --

-- The adder is whoever is signed in, whatever the client sends.
create or replace function public.stamp_new_expense()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  new.edit_count := 0;
  new.edited_at  := null;
  return new;
end;
$$;

drop trigger if exists expenses_stamp_new on public.expenses;
create trigger expenses_stamp_new
  before insert on public.expenses
  for each row execute function public.stamp_new_expense();

-- Every change to what an expense says goes through here. Updates that touch
-- nothing a person would call an edit (the recurring link being cleared when
-- its template is deleted, for one) pass straight through and are not counted.
create or replace function public.guard_expense_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_changed boolean;
begin
  -- Ownership never moves, except to null when the account is deleted.
  if new.created_by is not null then
    new.created_by := old.created_by;
  end if;

  v_changed :=
    (new.group_id, new.description, new.amount, new.paid_by, new.split_method,
     new.category, new.date, new.note)
    is distinct from
    (old.group_id, old.description, old.amount, old.paid_by, old.split_method,
     old.category, old.date, old.note)
    -- save_expense asks for a count when only the split changed, by bumping it.
    or new.edit_count is distinct from old.edit_count;

  -- The counters are only ever set here.
  new.edit_count := old.edit_count;
  new.edited_at  := old.edited_at;

  if not v_changed or v_uid is null then
    -- No edit, or maintenance by the service role: nothing to check or count.
    return new;
  end if;

  if old.created_by is distinct from v_uid then
    raise exception 'Only the person who added this expense can change it.'
      using errcode = '42501';
  end if;

  if old.edit_count >= 2 then
    raise exception 'This expense has already been edited twice, which is the limit.'
      using errcode = 'P0001';
  end if;

  new.edit_count := old.edit_count + 1;
  new.edited_at  := now();
  return new;
end;
$$;

drop trigger if exists expenses_guard_update on public.expenses;
create trigger expenses_guard_update
  before update on public.expenses
  for each row execute function public.guard_expense_update();

revoke all on function public.stamp_new_expense()    from public, anon, authenticated;
revoke all on function public.guard_expense_update() from public, anon, authenticated;

-- ---------------------------------------------------------------- policies --

drop policy if exists expenses_member_all    on public.expenses;
drop policy if exists expenses_member_select on public.expenses;
drop policy if exists expenses_member_insert on public.expenses;
drop policy if exists expenses_member_update on public.expenses;
drop policy if exists expenses_creator_delete on public.expenses;

create policy expenses_member_select on public.expenses for select
  using (public.is_group_member(group_id));

create policy expenses_member_insert on public.expenses for insert
  with check (public.is_group_member(group_id));

-- Members may reach the row; guard_expense_update decides whether the change
-- is theirs to make, so the refusal comes back as a reason, not a silent
-- "0 rows".
create policy expenses_member_update on public.expenses for update
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy expenses_creator_delete on public.expenses for delete
  using (public.is_group_member(group_id) and created_by = (select auth.uid()));

-- Split rows: readable by the group, writable only by the expense's adder and
-- only from inside save_expense, which flags the expense it is saving.
drop policy if exists expense_participants_member_all    on public.expense_participants;
drop policy if exists expense_participants_member_select on public.expense_participants;
drop policy if exists expense_participants_saver_insert  on public.expense_participants;
drop policy if exists expense_participants_saver_update  on public.expense_participants;
drop policy if exists expense_participants_saver_delete  on public.expense_participants;

create policy expense_participants_member_select on public.expense_participants for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

create policy expense_participants_saver_insert on public.expense_participants for insert
  with check (
    current_setting('justsplit.saving_expense', true) = expense_id::text
    and exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.created_by = (select auth.uid())
    )
  );

create policy expense_participants_saver_update on public.expense_participants for update
  using (
    current_setting('justsplit.saving_expense', true) = expense_id::text
    and exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.created_by = (select auth.uid())
    )
  );

create policy expense_participants_saver_delete on public.expense_participants for delete
  using (
    current_setting('justsplit.saving_expense', true) = expense_id::text
    and exists (
      select 1 from public.expenses e
      where e.id = expense_id and e.created_by = (select auth.uid())
    )
  );

-- ------------------------------------------------------------ save_expense --

-- Same signature as 0013. What changed:
--   * saving an expense with nothing different returns without touching it,
--     so it is not counted as an edit (this also keeps a retried insert after
--     a dropped connection from counting);
--   * a change to the split alone is still an edit, so it is counted;
--   * the split rows are rewritten under the saving_expense flag the policies
--     above require.
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
  v_id        uuid := coalesce(p_expense_id, extensions.gen_random_uuid());
  v_note      text := nullif(trim(coalesce(p_note, '')), '');
  v_total     bigint;
  v_existing  public.expenses%rowtype;
  v_old_split jsonb;
  v_new_split jsonb;
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

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'm', (p->>'member_id')::uuid,
               'v', nullif(p->>'input_value', '')::numeric,
               'a', (p->>'amount_owed')::bigint,
               'p', coalesce((p->>'position')::int, ord::int - 1)
             )
             order by coalesce((p->>'position')::int, ord::int - 1)
           ),
           '[]'::jsonb
         )
    into v_new_split
  from jsonb_array_elements(p_participants) with ordinality as t(p, ord);

  select * into v_existing from public.expenses where id = v_id;

  if found then
    select coalesce(
             jsonb_agg(
               jsonb_build_object('m', member_id, 'v', input_value, 'a', amount_owed, 'p', position)
               order by position
             ),
             '[]'::jsonb
           )
      into v_old_split
    from public.expense_participants
    where expense_id = v_id;

    if (v_existing.group_id, v_existing.description, v_existing.amount, v_existing.paid_by,
        v_existing.split_method, v_existing.category, v_existing.date, v_existing.note)
       is not distinct from
       (p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category, p_date, v_note)
       and v_old_split = v_new_split then
      return v_id;
    end if;

    -- guard_expense_update checks who is asking and counts the edit; the bump
    -- here is what makes a split-only change count too.
    update public.expenses set
      description  = p_description,
      amount       = p_amount,
      paid_by      = p_paid_by,
      split_method = p_split_method,
      category     = p_category,
      date         = p_date,
      note         = v_note,
      edit_count   = edit_count + 1
    where id = v_id;
  else
    insert into public.expenses (
      id, group_id, description, amount, paid_by, split_method, category, date, note,
      recurring_expense_id
    ) values (
      v_id, p_group_id, p_description, p_amount, p_paid_by, p_split_method, p_category, p_date,
      v_note, p_recurring_expense_id
    );
  end if;

  perform set_config('justsplit.saving_expense', v_id::text, true);

  delete from public.expense_participants where expense_id = v_id;

  insert into public.expense_participants (expense_id, member_id, input_value, amount_owed, position)
  select v_id,
         (p->>'member_id')::uuid,
         nullif(p->>'input_value', '')::numeric,
         (p->>'amount_owed')::bigint,
         coalesce((p->>'position')::int, ord::int - 1)
  from jsonb_array_elements(p_participants) with ordinality as t(p, ord);

  perform set_config('justsplit.saving_expense', '', true);

  return v_id;
end;
$$;
