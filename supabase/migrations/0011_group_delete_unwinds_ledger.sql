-- Deleting a group failed with a foreign key violation.
--
-- groups -> group_members cascades, but expense_participants.member_id is
-- ON DELETE RESTRICT, so removing a member with split rows is refused and the
-- cascade dies half way. That RESTRICT is deliberate and worth keeping: it is
-- what stops a member deletion from quietly orphaning split rows and breaking
-- the invariant that the parts sum to the whole. The app archives members
-- rather than deleting them for exactly this reason.
--
-- So instead of weakening the constraint, unwind the ledger first. Expenses,
-- settlements and templates go before members do, each cascading to its own
-- participant rows, which leaves nothing pointing at group_members by the time
-- its cascade runs.
create or replace function public.unwind_group_ledger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.expenses           where group_id = old.id;
  delete from public.settlements        where group_id = old.id;
  delete from public.recurring_expenses where group_id = old.id;
  return old;
end;
$$;

revoke all on function public.unwind_group_ledger() from public, anon, authenticated;

drop trigger if exists groups_unwind_ledger on public.groups;
create trigger groups_unwind_ledger
  before delete on public.groups
  for each row execute function public.unwind_group_ledger();
