-- A column-level REVOKE does not cut through a table-level SELECT grant:
-- Postgres treats the two as separate privileges, and the table grant already
-- covers every column. The revoke in migration 0003 was therefore a no-op and
-- clients could read their own bcrypt answer hashes.
--
-- Correct pattern: drop the table-wide grant, then grant back only the columns
-- the UI legitimately needs.

revoke select on public.user_recovery from anon, authenticated;

grant select (user_id, question_1, question_2, created_at, updated_at)
  on public.user_recovery to authenticated;

-- Insert and update still flow through set_recovery_questions(), which is
-- security definer, so no column grants are needed for writes.
revoke insert, update, delete on public.user_recovery from anon, authenticated;
