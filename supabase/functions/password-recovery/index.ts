import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * JustSplit — in-app password recovery.
 *
 * Setting a password for a locked-out user needs the service-role key, which
 * must never reach a browser. That is the whole reason this function exists:
 * the key lives here, and the browser only ever sees a yes or a no.
 *
 * Answer checking and lockout accounting stay in Postgres
 * (verify_recovery_answers), so the bcrypt hashes never leave the database
 * either. This function is the only thing that can turn a correct answer into
 * a new password.
 *
 * Deploy:  supabase functions deploy password-recovery
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Mirrors scorePassword() in src/lib/authValidation.ts. Client checks are a
 *  courtesy; this one is the one that counts. */
const COMMON = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty123', 'letmein1',
  'iloveyou', 'admin123', 'welcome1', 'abc12345', 'password123', 'qwertyuiop',
]);

function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== 'string' || pw.length === 0) return 'A new password is required.';
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (COMMON.has(pw.toLowerCase())) return 'That is one of the most guessed passwords.';
  if (/^(.)\1+$/.test(pw)) return 'Use more than one repeated character.';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  let payload: { email?: unknown; answers?: unknown; newPassword?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const newPassword = payload.newPassword;

  if (!email || answers.length !== 2 || answers.some((a) => typeof a !== 'string' || !a.trim())) {
    return json({ error: 'Answer both questions.' }, 400);
  }

  const pwProblem = passwordProblem(newPassword);
  if (pwProblem) return json({ error: pwProblem }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await admin.rpc('verify_recovery_answers', {
    p_email: email,
    p_answer_1: answers[0],
    p_answer_2: answers[1],
  });

  if (error) {
    console.error('verify_recovery_answers failed', error);
    return json({ error: 'Could not check those answers. Try again.' }, 500);
  }

  const result = data as {
    ok: boolean; reason?: string; attempts_left?: number; locked_until?: string; user_id?: string;
  };

  if (!result.ok) {
    if (result.reason === 'locked') {
      return json({
        error: 'Too many incorrect answers. Recovery is locked for 15 minutes.',
        lockedUntil: result.locked_until ?? null,
      }, 429);
    }
    // Deliberately identical whether the email is unknown, has no recovery set
    // up, or simply got the answers wrong — anything more is an oracle.
    return json({
      error: 'Those answers do not match.',
      attemptsLeft: result.attempts_left ?? null,
    }, 401);
  }

  const userId = result.user_id!;

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword as string,
  });
  if (updateError) {
    console.error('password update failed', updateError);
    return json({ error: 'Could not set that password. Try a different one.' }, 400);
  }

  // PRD 5.1: a reset must not leave old sessions alive on other devices.
  const { error: revokeError } = await admin.rpc('revoke_all_sessions', { p_user_id: userId });
  if (revokeError) {
    // The password did change, so this is not a failure for the user — but it
    // is worth shouting about, because it is the mitigation that limits the
    // damage when an attacker is the one doing the reset.
    console.error('session revocation failed after password reset', revokeError);
  }

  return json({ ok: true, sessionsRevoked: !revokeError });
});
