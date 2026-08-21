-- ============================================================================
-- JustSplit — Phase 2: auth foundation
--
-- Supabase already gives us auth.users (email/password + Google OAuth). That
-- table is managed by Supabase and is not directly readable by the client, so
-- we mirror the few fields the UI needs into public.profiles and lock it down
-- with row-level security.
--
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- It is idempotent: re-running it is safe.
-- ============================================================================

-- ---------------------------------------------------------------- profiles --

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null default '',
  email       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing user profile, one row per auth.users row. Phase 3 adds the security-question columns for in-app password reset.';

-- ------------------------------------------------------------------- RLS ---
-- Every policy is scoped to auth.uid(), so a signed-in client can only ever
-- see and change its own row. This is the server-side authorisation the app
-- has never had: it is enforced by Postgres, not by the frontend.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Deliberately no delete policy: profiles are removed by the cascade from
-- auth.users, never directly by a client.

-- --------------------------------------------------------------- triggers --

-- Keep updated_at honest without trusting the client to send it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create the profile the moment a user signs up, whether that was email or
-- Google. security definer is required: the trigger runs before any session
-- exists, so it cannot satisfy the RLS insert policy on its own.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'There'
    ),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for anyone who signed up before this migration ran.
insert into public.profiles (id, name, email, avatar_url)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'There'
  ),
  u.email,
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;
