-- ============================================================================
-- Phase 10: find people who already have an account.
--
-- Groups are now built from accounts, not typed names: you search for a
-- friend, add them, and the group appears on their dashboard the next time
-- they sign in. Profiles are private under RLS (each user reads only their
-- own row), so the search goes through this one narrow definer function
-- instead of opening the table.
--
-- What it reveals, deliberately: name, photo, and a masked email
-- ("r•••@gmail.com") so two people called Rahul can be told apart. Never the
-- full address, and nothing at all to signed-out callers. Only accounts that
-- finished onboarding (name and photo) are findable, since nobody else can
-- use the app yet.
--
-- Matching is a plain case-insensitive substring on the name, or an exact
-- match on the full email -- so someone who knows a friend's address can
-- still find them when the name is common.
-- ============================================================================

create or replace function public.search_accounts(p_query text)
returns table (user_id uuid, name text, avatar_url text, email_hint text)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (
    select lower(trim(coalesce(p_query, ''))) as text
  )
  select
    p.id,
    p.name,
    p.avatar_url,
    case
      when p.email like '%@%'
        then left(split_part(p.email, '@', 1), 1) || '•••@' || split_part(p.email, '@', 2)
    end
  from public.profiles p, q
  where (select auth.uid()) is not null
    and p.id <> (select auth.uid())
    and p.avatar_url is not null
    and length(trim(p.name)) > 0
    and length(q.text) >= 2
    -- position() rather than ILIKE, so a typed % or _ is just a character.
    and (position(q.text in lower(p.name)) > 0 or lower(p.email) = q.text)
  order by
    (position(q.text in lower(p.name)) = 1) desc,  -- "Ra" ranks Rahul above Kiran
    lower(p.name)
  limit 8;
$$;

revoke all on function public.search_accounts(text) from public, anon;
grant execute on function public.search_accounts(text) to authenticated;
