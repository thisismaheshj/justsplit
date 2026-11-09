/**
 * Switched off. Google is the only way to sign in to JustSplit, so there is no
 * password to reset by security questions (see migration 0020). The function
 * stays deployed as this stub so that anything still calling it gets a clear
 * answer instead of reaching the old reset code. The original implementation is
 * in git history (supabase/functions/password-recovery/index.ts before 2026-11-09).
 */
Deno.serve(() =>
  new Response(
    JSON.stringify({ error: 'Password reset is no longer available. Sign in with Google instead.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  ),
);
