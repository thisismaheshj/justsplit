-- ============================================================================
-- Password recovery by security questions is switched off.
--
-- Google is now the only way to sign in, so there is no password to reset:
-- the reset page and the screens for setting questions are gone from the app,
-- and the password-recovery edge function is replaced by a stub that refuses
-- every request. What is left here is the database side of that flow.
--
-- recovery_questions_for_email was callable without signing in, and
-- set_recovery_questions by anyone signed in. Nothing calls either now, so
-- neither should be reachable. The functions and the user_recovery table are
-- kept, not dropped (no one had set questions when this ran), so the feature
-- can be restored by re-granting if email sign-in ever returns.
-- ============================================================================

revoke all on function public.recovery_questions_for_email(text) from public, anon, authenticated;
revoke all on function public.set_recovery_questions(text, text, text, text) from public, anon, authenticated;
