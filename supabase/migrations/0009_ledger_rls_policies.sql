-- ============================================================================
-- Phase 4c: authorisation. Every ledger row is reachable only by a member of
-- its group, enforced in Postgres so a bug in the client cannot leak a group.
--
-- Members get full CRUD inside their own group, matching how the app already
-- behaves (anyone can correct anyone's expense). Per-role restrictions would
-- be a product decision, not a security one, and are not in this phase.
--
-- Child rows derive membership from their parent's group_id. FOR ALL keeps the
-- four commands in step: it is easy to add a policy for SELECT and forget
-- DELETE, and the gap is silent.
-- ============================================================================

drop policy if exists expenses_member_all on public.expenses;
create policy expenses_member_all on public.expenses for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists settlements_member_all on public.settlements;
create policy settlements_member_all on public.settlements for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists recurring_member_all on public.recurring_expenses;
create policy recurring_member_all on public.recurring_expenses for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists group_categories_member_all on public.group_categories;
create policy group_categories_member_all on public.group_categories for all
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- Split rows inherit their parent's group.
drop policy if exists expense_participants_member_all on public.expense_participants;
create policy expense_participants_member_all on public.expense_participants for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

drop policy if exists recurring_participants_member_all on public.recurring_participants;
create policy recurring_participants_member_all on public.recurring_participants for all
  using (
    exists (
      select 1 from public.recurring_expenses r
      where r.id = recurring_id and public.is_group_member(r.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.recurring_expenses r
      where r.id = recurring_id and public.is_group_member(r.group_id)
    )
  );

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at before update on public.expenses
  for each row execute function public.touch_updated_at();

drop trigger if exists settlements_touch_updated_at on public.settlements;
create trigger settlements_touch_updated_at before update on public.settlements
  for each row execute function public.touch_updated_at();

drop trigger if exists recurring_touch_updated_at on public.recurring_expenses;
create trigger recurring_touch_updated_at before update on public.recurring_expenses
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Creating a group and seeding its owner row is two writes that must not half
-- succeed: a group with no members is invisible to everyone, including the
-- person who just made it, because groups_select_member requires membership.
-- ---------------------------------------------------------------------------
create or replace function public.create_group(
  p_name text,
  p_currency text,
  p_owner_name text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_group uuid;
  v_name  text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.groups (name, currency, created_by)
  values (p_name, upper(coalesce(p_currency, 'INR')), v_uid)
  returning id into v_group;

  select coalesce(nullif(trim(coalesce(p_owner_name, '')), ''), p.name, 'Me')
    into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.group_members (group_id, user_id, name, role)
  values (v_group, v_uid, coalesce(v_name, 'Me'), 'owner');

  return v_group;
end;
$$;

revoke all on function public.create_group(text, text, text) from public, anon;
grant execute on function public.create_group(text, text, text) to authenticated;
