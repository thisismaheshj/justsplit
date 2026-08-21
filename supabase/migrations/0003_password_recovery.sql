-- ============================================================================
-- JustSplit — Phase 3: in-app password recovery (PRD 5.1 Option A)
--
-- Reset without email delivery. The user answers two security questions they
-- chose earlier; answers are bcrypt-hashed and never leave the database.
--
-- Threat model, stated plainly: without proof of inbox ownership, the answers
-- ARE the account. Three things carry the weight:
--   1. answers are hashed, never stored or returned in the clear
--   2. wrong answers lock recovery for 15 minutes after 5 tries
--   3. an account with no recovery row cannot be reset at all
-- ============================================================================

create table if not exists public.user_recovery (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  question_1      text        not null,
  answer_1_hash   text        not null,
  question_2      text        not null,
  answer_2_hash   text        not null,
  failed_attempts int         not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_recovery is
  'Security-question recovery. Answer hashes are bcrypt and are not readable by any client role.';

alter table public.user_recovery enable row level security;

drop policy if exists "user_recovery_select_own" on public.user_recovery;
create policy "user_recovery_select_own"
  on public.user_recovery for select using ((select auth.uid()) = user_id);

drop policy if exists "user_recovery_insert_own" on public.user_recovery;
create policy "user_recovery_insert_own"
  on public.user_recovery for insert with check ((select auth.uid()) = user_id);

drop policy if exists "user_recovery_update_own" on public.user_recovery;
create policy "user_recovery_update_own"
  on public.user_recovery for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- RLS is row-level. These columns need column-level protection, and a
-- column-level REVOKE does NOT cut through a table-level SELECT grant — the
-- two are separate privileges and the table grant already covers every column.
-- So: drop the table-wide grant, then grant back only what the UI needs.
revoke select, insert, update, delete on public.user_recovery from anon, authenticated;
grant select (user_id, question_1, question_2, created_at, updated_at)
  on public.user_recovery to authenticated;

drop trigger if exists user_recovery_touch_updated_at on public.user_recovery;
create trigger user_recovery_touch_updated_at
  before update on public.user_recovery
  for each row execute function public.touch_updated_at();

-- One normalisation used by both set and verify, so "New  York " and
-- "new york" can never disagree about whether they match.
create or replace function public.normalise_recovery_answer(p_answer text)
returns text language sql immutable set search_path = '' as $$
  select lower(trim(regexp_replace(coalesce(p_answer, ''), '\s+', ' ', 'g')));
$$;
