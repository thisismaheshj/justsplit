-- ============================================================================
-- Phase 3 continued: the operations recovery needs.
-- Applied to the project as migrations password_recovery_functions and
-- fix_recovery_column_grants.
-- ============================================================================

-- 1. Signed-in user sets or replaces their questions. Hashing happens here so a
--    plaintext answer never reaches a table and the client cannot pick a weaker
--    hash than intended. Re-setting also clears any active lockout.
create or replace function public.set_recovery_questions(
  p_question_1 text, p_answer_1 text, p_question_2 text, p_answer_2 text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_question_1 is null or p_question_2 is null or p_question_1 = p_question_2 then
    raise exception 'two different questions are required' using errcode = '22023';
  end if;
  if length(public.normalise_recovery_answer(p_answer_1)) < 2
     or length(public.normalise_recovery_answer(p_answer_2)) < 2 then
    raise exception 'answers must be at least 2 characters' using errcode = '22023';
  end if;

  insert into public.user_recovery as r (
    user_id, question_1, answer_1_hash, question_2, answer_2_hash, failed_attempts, locked_until
  ) values (
    v_uid, p_question_1,
    extensions.crypt(public.normalise_recovery_answer(p_answer_1), extensions.gen_salt('bf', 10)),
    p_question_2,
    extensions.crypt(public.normalise_recovery_answer(p_answer_2), extensions.gen_salt('bf', 10)),
    0, null
  )
  on conflict (user_id) do update set
    question_1 = excluded.question_1, answer_1_hash = excluded.answer_1_hash,
    question_2 = excluded.question_2, answer_2_hash = excluded.answer_2_hash,
    failed_attempts = 0, locked_until = null
  where r.user_id = v_uid;
end; $$;

revoke all on function public.set_recovery_questions(text, text, text, text) from public, anon;
grant execute on function public.set_recovery_questions(text, text, text, text) to authenticated;

-- 2. Questions for a locked-out visitor. Callable while signed out, so it must
--    never reveal whether an address has an account: an unknown or
--    recovery-less email gets two decoys chosen deterministically from a hash
--    of the address, so the same email always yields the same pair and probing
--    cannot distinguish it from a real one.
create or replace function public.recovery_questions_for_email(p_email text)
returns table (question_1 text, question_2 text)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_q1 text; v_q2 text; v_seed int;
  v_bank text[] := array['first_school','birth_city','childhood_friend','first_pet',
                         'mothers_maiden','first_employer','favourite_teacher','street_grew_up'];
begin
  select r.question_1, r.question_2 into v_q1, v_q2
  from public.user_recovery r join auth.users u on u.id = r.user_id
  where lower(u.email) = v_email;

  if v_q1 is not null then return query select v_q1, v_q2; return; end if;

  v_seed := abs(('x' || substr(encode(extensions.digest(v_email,'sha256'),'hex'),1,8))::bit(32)::int);
  return query select
    v_bank[1 + (v_seed % array_length(v_bank,1))],
    v_bank[1 + ((v_seed / 8 + 3) % array_length(v_bank,1))];
end; $$;

revoke all on function public.recovery_questions_for_email(text) from public;
grant execute on function public.recovery_questions_for_email(text) to anon, authenticated;

-- 3. Answer verification plus lockout accounting. service_role only — called by
--    the password-recovery edge function, never by a browser. Note the client
--    also cannot UPDATE user_recovery directly, so it cannot clear its own
--    lockout.
create or replace function public.verify_recovery_answers(
  p_email text, p_answer_1 text, p_answer_2 text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.user_recovery%rowtype; v_uid uuid; v_ok boolean;
  v_max_tries int := 5; v_lock interval := interval '15 minutes';
begin
  select u.id into v_uid from auth.users u
   where lower(u.email) = lower(trim(coalesce(p_email,'')));
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;

  select * into r from public.user_recovery where user_id = v_uid;
  -- No recovery configured means no recovery possible, and it answers in the
  -- same shape as a wrong guess so it does not become an oracle either.
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;

  if r.locked_until is not null and r.locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', r.locked_until);
  end if;

  v_ok := r.answer_1_hash = extensions.crypt(public.normalise_recovery_answer(p_answer_1), r.answer_1_hash)
      and r.answer_2_hash = extensions.crypt(public.normalise_recovery_answer(p_answer_2), r.answer_2_hash);

  if v_ok then
    update public.user_recovery set failed_attempts = 0, locked_until = null where user_id = v_uid;
    return jsonb_build_object('ok', true, 'user_id', v_uid);
  end if;

  update public.user_recovery
     set failed_attempts = failed_attempts + 1,
         locked_until = case when failed_attempts + 1 >= v_max_tries then now() + v_lock else null end
   where user_id = v_uid returning * into r;

  return jsonb_build_object('ok', false,
    'reason', case when r.locked_until is not null then 'locked' else 'invalid' end,
    'attempts_left', greatest(0, v_max_tries - r.failed_attempts),
    'locked_until', r.locked_until);
end; $$;

revoke all on function public.verify_recovery_answers(text, text, text) from public, anon, authenticated;

-- 4. Force re-login everywhere after a reset (PRD 5.1 mitigation). Deleting the
--    sessions is what actually invalidates outstanding refresh tokens.
create or replace function public.revoke_all_sessions(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.refresh_tokens where user_id = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;
end; $$;

revoke all on function public.revoke_all_sessions(uuid) from public, anon, authenticated;
