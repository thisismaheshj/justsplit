-- ============================================================================
-- Phase 8: an account's photo and name follow it into every group.
--
-- A profile photo is now required, and it should appear wherever that person
-- appears. Group screens render group_members rows, not profiles, and RLS
-- keeps every profile private to its owner -- so a fellow member can never
-- read your profile directly. Instead, every seat that belongs to an account
-- (user_id is not null) mirrors that account's name and photo:
--
--   * BEFORE INSERT/UPDATE on group_members copies them onto the seat, so no
--     client write path (create_group, setup, import, a stale edit) can leave
--     a seat out of step with its account.
--   * AFTER UPDATE on profiles pushes a change out to every seat at once.
--
-- Ghost members (user_id is null) are untouched: their name and photo are
-- still whatever the group gave them.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

create or replace function public.member_seat_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text;
  v_photo text;
begin
  if new.user_id is null then
    return new;
  end if;

  select nullif(trim(p.name), ''), p.avatar_url
    into v_name, v_photo
  from public.profiles p
  where p.id = new.user_id;

  -- group_members.name is capped at 40 characters by a check constraint.
  if v_name is not null then
    new.name := left(v_name, 40);
  end if;
  if v_photo is not null then
    new.avatar_photo := v_photo;
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_mirror_profile on public.group_members;
create trigger group_members_mirror_profile
  before insert or update on public.group_members
  for each row execute function public.member_seat_from_profile();

create or replace function public.profile_to_member_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The BEFORE trigger above does the actual copying; touching the rows is
  -- enough to fire it.
  update public.group_members m
     set updated_at = now()
   where m.user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_push_to_member_seats on public.profiles;
create trigger profiles_push_to_member_seats
  after update of name, avatar_url on public.profiles
  for each row
  when (old.name is distinct from new.name or old.avatar_url is distinct from new.avatar_url)
  execute function public.profile_to_member_seats();

-- Trigger functions have no business on the public RPC surface (see 0002).
revoke all on function public.member_seat_from_profile() from public, anon, authenticated;
revoke all on function public.profile_to_member_seats() from public, anon, authenticated;

-- Backfill: bring every existing account seat in line with its profile.
update public.group_members m
   set updated_at = now()
 where m.user_id is not null;
