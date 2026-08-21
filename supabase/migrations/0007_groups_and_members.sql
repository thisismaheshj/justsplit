-- ============================================================================
-- Phase 4a: groups and membership.
--
-- A member is a NAME that may or may not point at an account. user_id is
-- nullable so you can add "Rahul" and split with him in seconds without him
-- signing up; if he joins later the row gets claimed and his history follows.
-- Everything downstream references group_members, never auth.users directly.
-- ============================================================================

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(trim(name)) between 1 and 60),
  description text,
  currency    text        not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  created_by  uuid        not null references auth.users (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.groups is
  'One trip or shared household. Currency is per group; balances are never converted across groups.';

create table if not exists public.group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid        not null references public.groups (id) on delete cascade,
  -- Null means a "ghost" member: a real person in the ledger with no account.
  user_id       uuid        references auth.users (id) on delete set null,
  name          text        not null check (length(trim(name)) between 1 and 40),
  avatar_color  text        not null default '#4f46e5',
  avatar_photo  text,
  role          text        not null default 'member' check (role in ('owner', 'member')),
  archived      boolean     not null default false,
  joined_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.group_members.user_id is
  'Null for a ghost member. Set when the person claims their row by joining.';

-- One account cannot hold two seats in the same group; ghosts are unconstrained
-- because they are distinguished by id, matching the app rule that duplicate
-- names are allowed.
create unique index if not exists group_members_one_seat_per_user
  on public.group_members (group_id, user_id)
  where user_id is not null;

create index if not exists group_members_by_group on public.group_members (group_id);
create index if not exists group_members_by_user  on public.group_members (user_id) where user_id is not null;
create index if not exists groups_by_creator      on public.groups (created_by);

-- ---------------------------------------------------------------- helper --
-- Every group-scoped policy funnels through this. It is SECURITY DEFINER on
-- purpose: a policy on group_members that itself SELECTs group_members
-- recurses forever, and a definer function bypasses RLS to break the cycle.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

-- ----------------------------------------------------------- groups RLS --
drop policy if exists groups_select_member on public.groups;
create policy groups_select_member on public.groups for select
  using (public.is_group_member(id));

-- Anyone signed in may create a group, but only as themselves.
drop policy if exists groups_insert_own on public.groups;
create policy groups_insert_own on public.groups for insert
  with check ((select auth.uid()) = created_by);

drop policy if exists groups_update_member on public.groups;
create policy groups_update_member on public.groups for update
  using (public.is_group_member(id))
  with check (public.is_group_member(id));

-- Deleting a whole group is the creator's call alone.
drop policy if exists groups_delete_creator on public.groups;
create policy groups_delete_creator on public.groups for delete
  using ((select auth.uid()) = created_by);

-- --------------------------------------------------- group_members RLS --
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select
  using (public.is_group_member(group_id));

-- Seeding the first row is the gap every membership model has to solve: at
-- insert time you are not a member yet. Allowed only when you own the group.
drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert
  with check (
    public.is_group_member(group_id)
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.created_by = (select auth.uid())
    )
  );

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (public.is_group_member(group_id));

drop trigger if exists groups_touch_updated_at on public.groups;
create trigger groups_touch_updated_at before update on public.groups
  for each row execute function public.touch_updated_at();

drop trigger if exists group_members_touch_updated_at on public.group_members;
create trigger group_members_touch_updated_at before update on public.group_members
  for each row execute function public.touch_updated_at();
