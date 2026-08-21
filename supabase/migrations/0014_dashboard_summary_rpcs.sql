-- ============================================================================
-- Phase 6: the cross-group dashboard.
--
-- Loading every group in full just to show one number each would mean N round
-- trips that each pull a whole ledger. These two functions do the arithmetic
-- in Postgres and return one row per group, and one row per recent entry.
--
-- SECURITY INVOKER (the default): RLS still applies, so "every group" means
-- every group the caller belongs to and nothing else. No membership check is
-- written here because the policies already are the check.
--
-- The balance formula matches lib/calculations.ts exactly -- paid minus owed,
-- plus settlements made, minus settlements received -- because the app and the
-- database disagreeing about someone's balance would be worse than either
-- being wrong on its own.
-- ============================================================================

create or replace function public.dashboard_groups()
returns table (
  group_id      uuid,
  name          text,
  currency      text,
  member_count  int,
  expense_count int,
  total_spend   bigint,
  my_balance    bigint,
  last_activity date
)
language sql
stable
set search_path = ''
as $$
  with me as (
    select m.id as member_id, m.group_id
    from public.group_members m
    where m.user_id = (select auth.uid())
  )
  select
    g.id,
    g.name,
    g.currency,
    (select count(*)::int from public.group_members m
       where m.group_id = g.id and not m.archived),
    (select count(*)::int from public.expenses e where e.group_id = g.id),
    coalesce((select sum(e.amount) from public.expenses e where e.group_id = g.id), 0)::bigint,
    (
      coalesce((select sum(e.amount) from public.expenses e
                 where e.group_id = g.id and e.paid_by = me.member_id), 0)
      - coalesce((select sum(p.amount_owed)
                    from public.expense_participants p
                    join public.expenses e on e.id = p.expense_id
                   where e.group_id = g.id and p.member_id = me.member_id), 0)
      + coalesce((select sum(s.amount) from public.settlements s
                   where s.group_id = g.id and s.from_member = me.member_id), 0)
      - coalesce((select sum(s.amount) from public.settlements s
                   where s.group_id = g.id and s.to_member = me.member_id), 0)
    )::bigint,
    greatest(
      (select max(e.date) from public.expenses e where e.group_id = g.id),
      (select max(s.date) from public.settlements s where s.group_id = g.id)
    )
  from public.groups g
  join me on me.group_id = g.id
  order by g.created_at;
$$;

revoke all on function public.dashboard_groups() from public, anon;
grant execute on function public.dashboard_groups() to authenticated;

-- One feed across every group. Expenses and settlements are different shapes,
-- so they are normalised into a common row here rather than in the client.
create or replace function public.dashboard_activity(p_limit int default 12)
returns table (
  entry_id    uuid,
  kind        text,
  group_id    uuid,
  group_name  text,
  currency    text,
  description text,
  amount      bigint,
  entry_date  date,
  actor_name  text,
  other_name  text,
  category    text,
  created_at  timestamptz
)
language sql
stable
set search_path = ''
as $$
  select * from (
    select
      e.id, 'expense'::text, g.id, g.name, g.currency,
      e.description, e.amount, e.date,
      payer.name, null::text, e.category, e.created_at
    from public.expenses e
    join public.groups g on g.id = e.group_id
    join public.group_members payer on payer.id = e.paid_by

    union all

    select
      s.id, 'settlement'::text, g.id, g.name, g.currency,
      null::text, s.amount, s.date,
      payer.name, payee.name, null::text, s.created_at
    from public.settlements s
    join public.groups g on g.id = s.group_id
    join public.group_members payer on payer.id = s.from_member
    join public.group_members payee on payee.id = s.to_member
  ) feed
  order by feed.date desc, feed.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

revoke all on function public.dashboard_activity(int) from public, anon;
grant execute on function public.dashboard_activity(int) to authenticated;
