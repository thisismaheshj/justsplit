-- Two fixes, no data touched: one function body replaced, one grant revoked.
--
-- 1. The decoy generator could pick the SAME question twice. Reproduced on the
--    first address tried: definitely-not-a-user@justsplit.test returned
--    "mother's maiden name" for both slots. set_recovery_questions() rejects
--    p_question_1 = p_question_2, so a real account can never show a duplicate
--    pair -- which made a duplicate a reliable "no account here" signal, the
--    exact enumeration oracle the decoys exist to prevent.
--
--    Fix is the standard pick-two-distinct trick: choose the second index from
--    the remaining n-1 slots, then shift it past the first if it would collide.
create or replace function public.recovery_questions_for_email(p_email text)
returns table (question_1 text, question_2 text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_q1 text; v_q2 text;
  v_bank text[] := array[
    'first_school', 'birth_city', 'childhood_friend', 'first_pet',
    'mothers_maiden', 'first_employer', 'favourite_teacher', 'street_grew_up'
  ];
  v_n    int;
  v_seed bigint;
  v_i1   int;
  v_i2   int;
begin
  select r.question_1, r.question_2 into v_q1, v_q2
  from public.user_recovery r
  join auth.users u on u.id = r.user_id
  where lower(u.email) = v_email;

  if v_q1 is not null then
    return query select v_q1, v_q2;
    return;
  end if;

  -- Stable decoys: same address always yields the same pair, so repeated
  -- probing of one address cannot distinguish it from a configured account.
  v_n := array_length(v_bank, 1);
  v_seed := abs(('x' || substr(encode(extensions.digest(v_email, 'sha256'), 'hex'), 1, 8))::bit(32)::int::bigint);

  v_i1 := (v_seed % v_n)::int;
  v_i2 := ((v_seed / v_n) % (v_n - 1))::int;
  if v_i2 >= v_i1 then
    v_i2 := v_i2 + 1;
  end if;

  return query select v_bank[v_i1 + 1], v_bank[v_i2 + 1];
end;
$$;

revoke all on function public.recovery_questions_for_email(text) from public;
grant execute on function public.recovery_questions_for_email(text) to anon, authenticated;

-- 2. rls_auto_enable() is an event-trigger function and was reachable at
--    /rest/v1/rpc/rls_auto_enable. Same class of issue migration 0002 fixed for
--    handle_new_user(); the database linter flags both. Guarded because the
--    function is project-specific: a fresh project may not have it at all.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
