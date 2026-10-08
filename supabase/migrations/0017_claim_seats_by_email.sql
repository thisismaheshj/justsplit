-- ============================================================================
-- Phase 9: a ghost member can be claimed by email.
--
-- Groups from before accounts existed are full of ghost members: names with
-- history but no user_id. Giving a ghost an invite_email means whoever signs
-- up with that address takes over the seat, and with it every expense and
-- settlement already recorded against it -- no remapping, because the ledger
-- references the seat, never the account.
--
-- Two directions, so the order of events never matters:
--   * account first:  setting invite_email links the seat straight away
--   * email first:    the account links every waiting seat when its email
--                     is confirmed (at signup, when confirmation is off)
--
-- Only a CONFIRMED email claims a seat. With "Confirm email" switched off,
-- Supabase confirms at signup, so anyone typing an address gets its seats;
-- switching confirmation on closes that without a code change.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

alter table public.group_members
  add column if not exists invite_email text;

alter table public.group_members
  drop constraint if exists group_members_invite_email_shape;
alter table public.group_members
  add constraint group_members_invite_email_shape
  check (invite_email is null or invite_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

comment on column public.group_members.invite_email is
  'Ghost seats only: the first account to confirm this address takes the seat and its history.';

-- One address names one person per group; two seats would be ambiguous, and
-- the one-seat-per-user index would refuse the second claim anyway.
create unique index if not exists group_members_one_invite_per_group
  on public.group_members (group_id, lower(invite_email))
  where invite_email is not null;

-- ---------------------------------------------- account first, email later --
-- Runs before group_members_mirror_profile (triggers fire in name order), so a
-- seat linked here immediately picks up the account's name and photo.
create or replace function public.member_seat_claim_by_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if new.invite_email is not null then
    new.invite_email := lower(trim(new.invite_email));
  end if;

  if new.user_id is not null or new.invite_email is null then
    return new;
  end if;

  select u.id into v_user
  from auth.users u
  where lower(u.email) = new.invite_email
    and u.email_confirmed_at is not null;

  -- Leave it waiting if that account already holds a seat in this group.
  if v_user is not null and not exists (
    select 1 from public.group_members m
    where m.group_id = new.group_id and m.user_id = v_user and m.id <> new.id
  ) then
    new.user_id := v_user;
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_claim_by_email on public.group_members;
create trigger group_members_claim_by_email
  before insert or update of invite_email, user_id on public.group_members
  for each row execute function public.member_seat_claim_by_email();

-- ---------------------------------------------- email first, account later --
create or replace function public.claim_seats_on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_members m
     set user_id = new.id
   where m.user_id is null
     and m.invite_email = lower(new.email)
     and not exists (
       select 1 from public.group_members x
       where x.group_id = m.group_id and x.user_id = new.id
     );
  return new;
end;
$$;

-- Named to sort after on_auth_user_created, so the profile row exists by the
-- time a claimed seat asks for its name.
drop trigger if exists on_auth_user_created_claim_seats on auth.users;
create trigger on_auth_user_created_claim_seats
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null and new.email is not null)
  execute function public.claim_seats_on_email_confirmed();

drop trigger if exists on_auth_user_confirmed_claim_seats on auth.users;
create trigger on_auth_user_confirmed_claim_seats
  after update of email_confirmed_at, email on auth.users
  for each row
  when (new.email_confirmed_at is not null and new.email is not null
        and (old.email_confirmed_at is null or old.email is distinct from new.email))
  execute function public.claim_seats_on_email_confirmed();

revoke all on function public.member_seat_claim_by_email() from public, anon, authenticated;
revoke all on function public.claim_seats_on_email_confirmed() from public, anon, authenticated;
