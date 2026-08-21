-- ============================================================================
-- JustSplit — Phase 2 follow-up
--
-- Supabase's database linter flagged handle_new_user() as a SECURITY DEFINER
-- function reachable at /rest/v1/rpc/handle_new_user by anonymous callers.
-- A trigger function cannot do anything useful when invoked directly, but
-- there is no reason for it to be on the public API surface at all.
-- ============================================================================

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
